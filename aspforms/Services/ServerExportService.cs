using FormsManagementApi.DTOs;
using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace FormsManagementApi.Services;

/// <summary>
/// Service for handling server-side export operations
/// Manages export lifecycle, file generation, and cleanup
/// </summary>
public class ServerExportService : IServerExportService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ServerExportService> _logger;
    private readonly string _exportDirectory;
    private static readonly ConcurrentDictionary<Guid, ExportOperationDto> _exportOperations = new();

    public ServerExportService(
        IServiceProvider serviceProvider,
        ILogger<ServerExportService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _exportDirectory = configuration.GetValue<string>("ExportSettings:ExportDirectory") 
            ?? Path.Combine(Path.GetTempPath(), "FormExports");
        
        // Ensure export directory exists
        Directory.CreateDirectory(_exportDirectory);
        _logger.LogInformation("Export directory initialized: {ExportDirectory}", _exportDirectory);
    }

    public async Task<ApiResponse<ExportResultDto>> InitiateExportAsync(ServerExportRequestDto request, Guid? userId)
    {
        try
        {
            var exportId = Guid.NewGuid();
            var operation = new ExportOperationDto
            {
                ExportId = exportId,
                FormId = request.FormId,
                Format = request.Format.ToLower(),
                Status = "Processing",
                Progress = 0,
                CreatedAt = DateTime.UtcNow,
                Request = request
            };

            _exportOperations[exportId] = operation;

            // Start background export process
            _ = Task.Run(async () => await ProcessExportAsync(operation, userId));

            var result = new ExportResultDto
            {
                ExportId = exportId,
                Status = "Processing",
                EstimatedCompletion = DateTime.UtcNow.AddMinutes(5) // Estimate 5 minutes
            };

            _logger.LogInformation("Export operation {ExportId} initiated for form {FormId} by user {UserId}", 
                exportId, request.FormId, userId);

            return ApiResponse<ExportResultDto>.SuccessResponse(result, "Export initiated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initiate export for form {FormId}", request.FormId);
            return ApiResponse<ExportResultDto>.ErrorResponse("Failed to initiate export operation");
        }
    }

    public async Task<ApiResponse<ExportStatusDto>> GetExportStatusAsync(Guid exportId, Guid? userId)
    {
        try
        {
            if (!_exportOperations.TryGetValue(exportId, out var operation))
            {
                return ApiResponse<ExportStatusDto>.ErrorResponse("Export operation not found");
            }

            var status = new ExportStatusDto
            {
                ExportId = exportId,
                Status = operation.Status,
                Progress = operation.Progress,
                ErrorMessage = operation.ErrorMessage,
                FileSizeBytes = operation.FileSizeBytes,
                CreatedAt = operation.CreatedAt,
                CompletedAt = operation.CompletedAt
            };

            if (operation.Status == "Completed" && !string.IsNullOrEmpty(operation.FilePath))
            {
                status.DownloadUrl = $"/api/export/download/{exportId}";
            }

            return ApiResponse<ExportStatusDto>.SuccessResponse(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get export status for {ExportId}", exportId);
            return ApiResponse<ExportStatusDto>.ErrorResponse("Failed to retrieve export status");
        }
    }

    public async Task<(Stream? FileStream, string? FileName, string? ContentType)> DownloadExportAsync(Guid exportId, Guid? userId)
    {
        try
        {
            if (!_exportOperations.TryGetValue(exportId, out var operation))
            {
                _logger.LogWarning("Download attempted for non-existent export {ExportId}", exportId);
                return (null, null, null);
            }

            if (operation.Status != "Completed" || string.IsNullOrEmpty(operation.FilePath))
            {
                _logger.LogWarning("Download attempted for incomplete export {ExportId}", exportId);
                return (null, null, null);
            }

            if (!File.Exists(operation.FilePath))
            {
                _logger.LogWarning("Export file not found for {ExportId}: {FilePath}", exportId, operation.FilePath);
                return (null, null, null);
            }

            var fileStream = new FileStream(operation.FilePath, FileMode.Open, FileAccess.Read);
            var fileName = Path.GetFileName(operation.FilePath);
            var contentType = operation.Format switch
            {
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "csv" => "text/csv",
                _ => "application/octet-stream"
            };

            _logger.LogInformation("Export file {ExportId} downloaded by user {UserId}", exportId, userId);
            return (fileStream, fileName, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download export {ExportId}", exportId);
            return (null, null, null);
        }
    }

    public async Task<ApiResponse<bool>> CancelExportAsync(Guid exportId, Guid? userId)
    {
        try
        {
            if (!_exportOperations.TryGetValue(exportId, out var operation))
            {
                return ApiResponse<bool>.ErrorResponse("Export operation not found");
            }

            if (operation.Status == "Completed" || operation.Status == "Failed")
            {
                return ApiResponse<bool>.ErrorResponse("Cannot cancel completed or failed export");
            }

            operation.Status = "Cancelled";
            operation.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("Export operation {ExportId} cancelled by user {UserId}", exportId, userId);
            return ApiResponse<bool>.SuccessResponse(true, "Export cancelled successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel export {ExportId}", exportId);
            return ApiResponse<bool>.ErrorResponse("Failed to cancel export operation");
        }
    }

    public async Task<int> CleanupOldExportsAsync(int olderThanHours = 24)
    {
        var cleanupCount = 0;
        var cutoffTime = DateTime.UtcNow.AddHours(-olderThanHours);

        try
        {
            var operationsToRemove = _exportOperations.Values
                .Where(op => op.CreatedAt < cutoffTime)
                .ToList();

            foreach (var operation in operationsToRemove)
            {
                // Delete file if it exists
                if (!string.IsNullOrEmpty(operation.FilePath) && File.Exists(operation.FilePath))
                {
                    try
                    {
                        File.Delete(operation.FilePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete export file {FilePath}", operation.FilePath);
                    }
                }

                // Remove from tracking
                _exportOperations.TryRemove(operation.ExportId, out _);
                cleanupCount++;
            }

            _logger.LogInformation("Cleaned up {Count} old export operations", cleanupCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old exports");
        }

        return cleanupCount;
    }

    private async Task ProcessExportAsync(ExportOperationDto operation, Guid? userId)
    {
        try
        {
            _logger.LogInformation("Starting export processing for {ExportId}", operation.ExportId);
            _logger.LogInformation("Export request details: FormId={FormId}, SelectedFields={SelectedFields}, Format={Format}, PageSize={PageSize}", 
                operation.Request.FormId, 
                string.Join(", ", operation.Request.SelectedFields), 
                operation.Format,
                operation.Request.Filters.PageSize);
            
            // Update progress
            operation.Progress = 10;

            // Create a new scope for database operations to avoid disposed context issues
            using var scope = _serviceProvider.CreateScope();
            var formSubmissionService = scope.ServiceProvider.GetRequiredService<IFormSubmissionService>();

            // Get export data using scoped service
            var exportResult = await formSubmissionService.GetFormSubmissionsForExportAsync(
                operation.Request.FormId,
                operation.Request.Filters,
                operation.Request.SelectedFields,
                operation.Request.IncludeMetadata);

            _logger.LogInformation("Export data retrieval for {ExportId}: Success={Success}, Message={Message}, DataExists={DataExists}", 
                operation.ExportId, exportResult.Success, exportResult.Message, exportResult.Data != null);

            if (exportResult.Data != null)
            {
                _logger.LogInformation("Export data details: FormName={FormName}, TotalResponses={TotalResponses}, FieldCount={FieldCount}, ResponseCount={ResponseCount}",
                    exportResult.Data.FormName, exportResult.Data.TotalResponses, exportResult.Data.Fields.Count, exportResult.Data.Responses.Count);
                
                if (exportResult.Data.Fields.Any())
                {
                    _logger.LogInformation("Available fields: {Fields}", 
                        string.Join(", ", exportResult.Data.Fields.Select(f => $"{f.Id}({f.Label})")));
                }
                
                if (exportResult.Data.Responses.Any())
                {
                    var firstResponse = exportResult.Data.Responses.First();
                    _logger.LogInformation("First response keys: {Keys}", 
                        string.Join(", ", firstResponse.Keys));
                }
                else
                {
                    _logger.LogWarning("No responses found for export {ExportId}", operation.ExportId);
                }
            }
            else
            {
                _logger.LogError("Export data is null for {ExportId}. Message: {Message}", operation.ExportId, exportResult.Message);
            }

            if (!exportResult.Success || exportResult.Data == null)
            {
                operation.Status = "Failed";
                operation.ErrorMessage = exportResult.Message;
                operation.CompletedAt = DateTime.UtcNow;
                return;
            }

            operation.Progress = 50;

            // Generate file based on format
            var fileName = GenerateFileName(operation.Request.FileName, operation.Request.FormId, operation.Format);
            var filePath = Path.Combine(_exportDirectory, fileName);
            
            _logger.LogInformation("Generating {Format} file: {FilePath}", operation.Format.ToUpper(), filePath);

            switch (operation.Format)
            {
                case "xlsx":
                    await GenerateExcelFileAsync(exportResult.Data, filePath);
                    break;
                case "csv":
                    await GenerateCsvFileAsync(exportResult.Data, filePath);
                    break;
                default:
                    throw new NotSupportedException($"Export format '{operation.Format}' is not supported");
            }
            
            _logger.LogInformation("File generation completed: {FilePath}", filePath);

            operation.Progress = 90;

            // Get file size
            var fileInfo = new FileInfo(filePath);
            operation.FileSizeBytes = fileInfo.Length;
            operation.FilePath = filePath;
            operation.Progress = 100;
            operation.Status = "Completed";
            operation.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("Export {ExportId} completed successfully. File: {FilePath}, Size: {Size} bytes", 
                operation.ExportId, filePath, operation.FileSizeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Export processing failed for {ExportId}", operation.ExportId);
            operation.Status = "Failed";
            operation.ErrorMessage = ex.Message;
            operation.CompletedAt = DateTime.UtcNow;
        }
    }

    private async Task GenerateExcelFileAsync(ExportDataDto data, string filePath)
    {
        // For now, we'll create a simple Excel-like format using CSV
        // In a real implementation, you would use EPPlus or similar library
        var csvFilePath = filePath.Replace(".xlsx", ".csv");
        
        await GenerateCsvFileAsync(data, csvFilePath);
        
        // Rename to xlsx for now (in real implementation, generate actual Excel)
        if (File.Exists(csvFilePath))
        {
            // Delete target file if it exists to avoid "file already exists" error
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.LogInformation("Deleted existing file: {FilePath}", filePath);
            }
            
            File.Move(csvFilePath, filePath);
            _logger.LogInformation("Moved {CsvFile} to {ExcelFile}", csvFilePath, filePath);
        }
    }

    private async Task GenerateCsvFileAsync(ExportDataDto data, string filePath)
    {
        _logger.LogInformation("Generating CSV file at {FilePath}. Form: {FormName}, Fields: {FieldCount}, Responses: {ResponseCount}", 
            filePath, data.FormName, data.Fields.Count, data.Responses.Count);

        using var writer = new StreamWriter(filePath, false, Encoding.UTF8);
        
        // Handle case where no fields or responses are found
        if (data.Fields.Count == 0 && data.Responses.Count == 0)
        {
            _logger.LogWarning("No fields or responses found for export. Writing empty data message.");
            await writer.WriteLineAsync("No data found for export");
            await writer.WriteLineAsync($"Form: {data.FormName}");
            await writer.WriteLineAsync($"Total Responses: {data.TotalResponses}");
            await writer.WriteLineAsync("This could mean:");
            await writer.WriteLineAsync("1. The form has no submissions");
            await writer.WriteLineAsync("2. The selected fields don't exist in the form");
            await writer.WriteLineAsync("3. The user doesn't have access to this form's data");
            return;
        }
        
        // Write headers
        var headers = new List<string>();
        
        // Add field headers
        foreach (var field in data.Fields)
        {
            headers.Add(EscapeCsvValue(field.Label));
        }
        
        // Add metadata headers if any responses have metadata
        if (data.Responses.Any() && data.Responses.First().ContainsKey("_metadata"))
        {
            headers.AddRange(new[] { "Submitter Email", "Submitted At", "IP Address", "Form Version" });
        }
        
        // If no headers, add a default message
        if (headers.Count == 0)
        {
            headers.Add("No Fields Available");
        }
        
        _logger.LogInformation("Writing CSV headers: {Headers}", string.Join(", ", headers));
        await writer.WriteLineAsync(string.Join(",", headers));
        
        // Write data rows
        var rowCount = 0;
        if (data.Responses.Count == 0)
        {
            // Write a message row if no responses
            await writer.WriteLineAsync($"\"No responses found for this form\"");
            rowCount = 1;
        }
        else
        {
            foreach (var response in data.Responses)
            {
                var values = new List<string>();
                
                // Add field values
                foreach (var field in data.Fields)
                {
                    var value = response.ContainsKey(field.Id) ? response[field.Id]?.ToString() ?? "" : "";
                    values.Add(EscapeCsvValue(value));
                }
                
                // Add metadata values
                if (response.ContainsKey("_metadata") && response["_metadata"] is JsonElement metadata)
                {
                    values.Add(EscapeCsvValue(GetJsonProperty(metadata, "submitterEmail")));
                    values.Add(EscapeCsvValue(GetJsonProperty(metadata, "submittedAt")));
                    values.Add(EscapeCsvValue(GetJsonProperty(metadata, "submitterIp")));
                    values.Add(EscapeCsvValue(GetJsonProperty(metadata, "formVersion")));
                }
                
                await writer.WriteLineAsync(string.Join(",", values));
                rowCount++;
            }
        }
        
        _logger.LogInformation("CSV generation completed. Wrote {RowCount} data rows to {FilePath}", rowCount, filePath);
    }

    private string EscapeCsvValue(string value)
    {
        if (string.IsNullOrEmpty(value))
            return "\"\"";
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
        
        return value;
    }

    private string GetJsonProperty(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) ? prop.GetString() ?? "" : "";
    }

    private string GenerateFileName(string? customName, Guid formId, string format)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss_fff");
        var baseName = !string.IsNullOrEmpty(customName) 
            ? $"{customName}_{timestamp}"
            : $"form_export_{formId:N}_{timestamp}";
        
        return $"{baseName}.{format}";
    }
}