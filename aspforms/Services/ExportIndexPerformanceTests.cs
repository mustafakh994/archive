using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Data;
using FormsManagementApi.Models;
using System.Diagnostics;

namespace FormsManagementApi.Services;

/// <summary>
/// Performance tests for export optimization indexes
/// This class contains methods to test the performance impact of the database indexes
/// created for export functionality optimization.
/// </summary>
public class ExportIndexPerformanceTests
{
    private readonly ApplicationDbContext _context;

    public ExportIndexPerformanceTests(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Test query performance for date range filtering
    /// This should utilize the IX_FormSubmissions_FormId_SubmittedAt composite index
    /// </summary>
    public async Task<(TimeSpan Duration, int ResultCount)> TestDateRangeFilteringAsync(
        Guid formId, 
        DateTimeOffset startDate, 
        DateTimeOffset endDate)
    {
        var stopwatch = Stopwatch.StartNew();
        
        var results = await _context.FormSubmissions
            .Where(fs => fs.FormId == formId)
            .Where(fs => fs.SubmittedAt >= startDate && fs.SubmittedAt <= endDate)
            .OrderByDescending(fs => fs.SubmittedAt)
            .Take(1000)
            .ToListAsync();
        
        stopwatch.Stop();
        return (stopwatch.Elapsed, results.Count);
    }

    /// <summary>
    /// Test query performance for JSONB search
    /// This should utilize the IX_FormSubmissions_ResponseData_GIN index
    /// </summary>
    public async Task<(TimeSpan Duration, int ResultCount)> TestJsonbSearchAsync(
        Guid formId, 
        string searchTerm)
    {
        var stopwatch = Stopwatch.StartNew();
        
        var results = await _context.FormSubmissions
            .Where(fs => fs.FormId == formId)
            .Where(fs => EF.Functions.JsonContains(fs.ResponseData, $"\"{searchTerm}\""))
            .Take(1000)
            .ToListAsync();
        
        stopwatch.Stop();
        return (stopwatch.Elapsed, results.Count);
    }

    /// <summary>
    /// Test query performance for email search
    /// This should utilize the IX_FormSubmissions_SubmitterEmail_GIN index
    /// </summary>
    public async Task<(TimeSpan Duration, int ResultCount)> TestEmailSearchAsync(
        Guid formId, 
        string emailPattern)
    {
        var stopwatch = Stopwatch.StartNew();
        
        var results = await _context.FormSubmissions
            .Where(fs => fs.FormId == formId)
            .Where(fs => fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(emailPattern))
            .Take(1000)
            .ToListAsync();
        
        stopwatch.Stop();
        return (stopwatch.Elapsed, results.Count);
    }

    /// <summary>
    /// Test combined export query performance
    /// This simulates the actual export query with multiple filters
    /// </summary>
    public async Task<(TimeSpan Duration, int ResultCount)> TestCombinedExportQueryAsync(
        Guid formId,
        DateTimeOffset? startDate = null,
        DateTimeOffset? endDate = null,
        string? searchTerm = null,
        int pageSize = 1000,
        int page = 1)
    {
        var stopwatch = Stopwatch.StartNew();
        
        var query = _context.FormSubmissions
            .Include(fs => fs.Form)
            .Where(fs => fs.FormId == formId);

        // Apply date filters
        if (startDate.HasValue)
            query = query.Where(fs => fs.SubmittedAt >= startDate.Value);
        
        if (endDate.HasValue)
            query = query.Where(fs => fs.SubmittedAt <= endDate.Value);

        // Apply search filter
        if (!string.IsNullOrEmpty(searchTerm))
        {
            query = query.Where(fs => 
                EF.Functions.JsonContains(fs.ResponseData, $"\"{searchTerm}\"") ||
                (fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(searchTerm)));
        }

        // Order and paginate
        var results = await query
            .OrderByDescending(fs => fs.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        
        stopwatch.Stop();
        return (stopwatch.Elapsed, results.Count);
    }

    /// <summary>
    /// Get query execution plan for analysis
    /// This method helps analyze if indexes are being used correctly
    /// </summary>
    public async Task<string> GetQueryExecutionPlanAsync(Guid formId, string searchTerm)
    {
        var sql = @"
            EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
            SELECT fs.""Id"", fs.""FormId"", fs.""ResponseData"", fs.""SubmitterEmail"", fs.""SubmittedAt""
            FROM ""FormSubmissions"" fs
            WHERE fs.""FormId"" = @formId
              AND (fs.""ResponseData""::text ILIKE @searchPattern OR fs.""SubmitterEmail"" ILIKE @searchPattern)
            ORDER BY fs.""SubmittedAt"" DESC
            LIMIT 1000";

        var result = await _context.Database.SqlQueryRaw<string>(
            sql, 
            new object[] { formId, $"%{searchTerm}%" })
            .FirstOrDefaultAsync();

        return result ?? "No execution plan available";
    }

    /// <summary>
    /// Check if the required indexes exist in the database
    /// </summary>
    public async Task<List<string>> CheckIndexesExistAsync()
    {
        var sql = @"
            SELECT indexname
            FROM pg_indexes 
            WHERE tablename = 'FormSubmissions'
              AND indexname IN (
                'IX_FormSubmissions_FormId_SubmittedAt',
                'IX_FormSubmissions_ResponseData_GIN',
                'IX_FormSubmissions_SubmitterEmail',
                'IX_FormSubmissions_SubmitterEmail_GIN'
              )
            ORDER BY indexname";

        var indexes = await _context.Database.SqlQueryRaw<string>(sql).ToListAsync();
        return indexes;
    }

    /// <summary>
    /// Run a comprehensive performance test suite
    /// </summary>
    public async Task<Dictionary<string, object>> RunPerformanceTestSuiteAsync()
    {
        var results = new Dictionary<string, object>();
        
        // Use the first form from seed data
        var formId = Guid.Parse("60000000-0000-0000-0000-000000000001");
        var startDate = DateTimeOffset.UtcNow.AddDays(-30);
        var endDate = DateTimeOffset.UtcNow;

        try
        {
            // Test 1: Date range filtering
            var dateRangeTest = await TestDateRangeFilteringAsync(formId, startDate, endDate);
            results["DateRangeFilter"] = new
            {
                Duration = dateRangeTest.Duration.TotalMilliseconds,
                ResultCount = dateRangeTest.ResultCount
            };

            // Test 2: JSONB search
            var jsonbTest = await TestJsonbSearchAsync(formId, "Alice");
            results["JsonbSearch"] = new
            {
                Duration = jsonbTest.Duration.TotalMilliseconds,
                ResultCount = jsonbTest.ResultCount
            };

            // Test 3: Email search
            var emailTest = await TestEmailSearchAsync(formId, "alice");
            results["EmailSearch"] = new
            {
                Duration = emailTest.Duration.TotalMilliseconds,
                ResultCount = emailTest.ResultCount
            };

            // Test 4: Combined export query
            var combinedTest = await TestCombinedExportQueryAsync(
                formId, startDate, endDate, "Alice");
            results["CombinedExportQuery"] = new
            {
                Duration = combinedTest.Duration.TotalMilliseconds,
                ResultCount = combinedTest.ResultCount
            };

            // Test 5: Check indexes
            var indexes = await CheckIndexesExistAsync();
            results["ExistingIndexes"] = indexes;

            results["TestStatus"] = "Success";
            results["TestTimestamp"] = DateTimeOffset.UtcNow;
        }
        catch (Exception ex)
        {
            results["TestStatus"] = "Failed";
            results["Error"] = ex.Message;
            results["TestTimestamp"] = DateTimeOffset.UtcNow;
        }

        return results;
    }
}