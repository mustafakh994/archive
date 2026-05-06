using System.Text.Json;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Middleware;
using FormsManagementApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttachmentPdfJobsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public AttachmentPdfJobsController(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    private static string BuildOwnerKey(Guid userId) => $"user:{userId}";
    private const string JobKindSubmissionPdf = "submission_pdf";
    private const string JobKindTemplateZip = "template_zip";

    public sealed record SubmissionAttachmentsRequest(Guid SubmissionId, List<string>? AttachmentUrls);
    public sealed record CreateJobRequest(
        Guid? SubmissionId,
        string? Title,
        List<string>? AttachmentUrls,
        string? Kind,
        Guid? TemplateId,
        List<SubmissionAttachmentsRequest>? SubmissionAttachments
    );
    public sealed record UpdateJobStatusRequest(string? Status, int? Progress, string? ErrorMessage, string? FilePath, string? FileName, long? FileSizeBytes, DateTimeOffset? CompletedAt);

    public sealed class JobSubmissionAttachmentsDto
    {
        public Guid SubmissionId { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
    }

    public sealed class JobDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int Progress { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public string? FileName { get; set; }
        public long? FileSizeBytes { get; set; }
        public string? FilePath { get; set; }
        public List<string>? AttachmentUrls { get; set; }
        public string Kind { get; set; } = JobKindSubmissionPdf;
        public Guid? TemplateId { get; set; }
        public int? TotalSubmissions { get; set; }
        public List<JobSubmissionAttachmentsDto>? SubmissionAttachments { get; set; }
    }

    private sealed class AttachmentPayload
    {
        public string Kind { get; set; } = JobKindSubmissionPdf;
        public Guid? TemplateId { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
        public List<JobSubmissionAttachmentsDto> SubmissionAttachments { get; set; } = new();
    }

    private static List<string> NormalizeUrls(IEnumerable<string>? urls)
    {
        return urls?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct()
            .ToList() ?? new List<string>();
    }

    private static AttachmentPayload ParseAttachmentPayload(string rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
            return new AttachmentPayload();

        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Array)
            {
                return new AttachmentPayload
                {
                    Kind = JobKindSubmissionPdf,
                    AttachmentUrls = root.EnumerateArray()
                        .Where(x => x.ValueKind == JsonValueKind.String)
                        .Select(x => x.GetString() ?? string.Empty)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x.Trim())
                        .Distinct()
                        .ToList()
                };
            }

            if (root.ValueKind != JsonValueKind.Object)
                return new AttachmentPayload();

            var payload = new AttachmentPayload();
            if (root.TryGetProperty("kind", out var kindEl) && kindEl.ValueKind == JsonValueKind.String)
            {
                payload.Kind = (kindEl.GetString() ?? JobKindSubmissionPdf).Trim().ToLowerInvariant();
            }

            if (root.TryGetProperty("templateId", out var templateIdEl) && templateIdEl.ValueKind == JsonValueKind.String)
            {
                if (Guid.TryParse(templateIdEl.GetString(), out var parsedTemplate))
                    payload.TemplateId = parsedTemplate;
            }

            if (root.TryGetProperty("attachmentUrls", out var urlsEl) && urlsEl.ValueKind == JsonValueKind.Array)
            {
                payload.AttachmentUrls = urlsEl.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString() ?? string.Empty)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
                    .Distinct()
                    .ToList();
            }

            if (root.TryGetProperty("submissionAttachments", out var groupsEl) && groupsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var group in groupsEl.EnumerateArray())
                {
                    if (group.ValueKind != JsonValueKind.Object) continue;
                    if (!group.TryGetProperty("submissionId", out var submissionIdEl)) continue;
                    if (submissionIdEl.ValueKind != JsonValueKind.String) continue;
                    if (!Guid.TryParse(submissionIdEl.GetString(), out var submissionId)) continue;

                    List<string> groupUrls = new();
                    if (group.TryGetProperty("attachmentUrls", out var groupUrlsEl) && groupUrlsEl.ValueKind == JsonValueKind.Array)
                    {
                        groupUrls = groupUrlsEl.EnumerateArray()
                            .Where(x => x.ValueKind == JsonValueKind.String)
                            .Select(x => x.GetString() ?? string.Empty)
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .Select(x => x.Trim())
                            .Distinct()
                            .ToList();
                    }

                    if (groupUrls.Count == 0) continue;
                    payload.SubmissionAttachments.Add(new JobSubmissionAttachmentsDto
                    {
                        SubmissionId = submissionId,
                        AttachmentUrls = groupUrls
                    });
                }
            }

            if (string.IsNullOrWhiteSpace(payload.Kind))
                payload.Kind = payload.SubmissionAttachments.Count > 0 ? JobKindTemplateZip : JobKindSubmissionPdf;

            return payload;
        }
        catch
        {
            return new AttachmentPayload();
        }
    }

    private static string BuildAttachmentPayloadJson(
        string kind,
        Guid? templateId,
        List<string> attachmentUrls,
        List<SubmissionAttachmentsRequest>? submissionAttachments)
    {
        if (kind == JobKindTemplateZip)
        {
            var groups = submissionAttachments?
                .Select(group => new JobSubmissionAttachmentsDto
                {
                    SubmissionId = group.SubmissionId,
                    AttachmentUrls = NormalizeUrls(group.AttachmentUrls)
                })
                .Where(group => group.AttachmentUrls.Count > 0)
                .ToList() ?? new List<JobSubmissionAttachmentsDto>();

            return JsonSerializer.Serialize(new
            {
                kind = JobKindTemplateZip,
                templateId,
                submissionAttachments = groups
            });
        }

        return JsonSerializer.Serialize(attachmentUrls);
    }

    private static JobDto ToDto(AttachmentPdfJob row, bool includeInternal = false)
    {
        var payload = ParseAttachmentPayload(row.AttachmentUrlsJson);
        var dto = new JobDto
        {
            Id = row.Id,
            SubmissionId = row.SubmissionId,
            Title = row.Title,
            Status = row.Status,
            Progress = row.Progress,
            ErrorMessage = row.ErrorMessage,
            CreatedAt = row.CreatedAt,
            CompletedAt = row.CompletedAt,
            FileName = row.FileName,
            FileSizeBytes = row.FileSizeBytes,
            Kind = payload.Kind,
            TemplateId = payload.TemplateId,
            TotalSubmissions = payload.SubmissionAttachments.Count > 0 ? payload.SubmissionAttachments.Count : null
        };

        if (includeInternal)
        {
            dto.FilePath = row.FilePath;
            dto.AttachmentUrls = payload.AttachmentUrls;
            dto.SubmissionAttachments = payload.SubmissionAttachments;
        }

        return dto;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<JobDto>>> Create([FromBody] CreateJobRequest request)
    {
        var userId = HttpContext.GetUserId();
        if (!userId.HasValue)
            return Unauthorized(ApiResponse<JobDto>.ErrorResponse("Unauthorized"));

        var kind = string.IsNullOrWhiteSpace(request.Kind) ? JobKindSubmissionPdf : request.Kind.Trim().ToLowerInvariant();
        if (kind != JobKindSubmissionPdf && kind != JobKindTemplateZip)
            return BadRequest(ApiResponse<JobDto>.ErrorResponse("Unsupported kind"));

        var urls = NormalizeUrls(request.AttachmentUrls);
        var submissionGroups = request.SubmissionAttachments?
            .Select(group => new SubmissionAttachmentsRequest(group.SubmissionId, NormalizeUrls(group.AttachmentUrls)))
            .Where(group => group.AttachmentUrls != null && group.AttachmentUrls.Count > 0)
            .ToList() ?? new List<SubmissionAttachmentsRequest>();

        if (kind == JobKindSubmissionPdf && (request.SubmissionId == null || request.SubmissionId == Guid.Empty))
            return BadRequest(ApiResponse<JobDto>.ErrorResponse("submissionId is required"));
        if (kind == JobKindSubmissionPdf && urls.Count == 0)
            return BadRequest(ApiResponse<JobDto>.ErrorResponse("attachmentUrls is required"));
        if (kind == JobKindTemplateZip && (request.TemplateId == null || request.TemplateId == Guid.Empty))
            return BadRequest(ApiResponse<JobDto>.ErrorResponse("templateId is required"));
        if (kind == JobKindTemplateZip && submissionGroups.Count == 0)
            return BadRequest(ApiResponse<JobDto>.ErrorResponse("submissionAttachments is required"));

        var resolvedSubmissionId = kind == JobKindTemplateZip ? request.TemplateId!.Value : request.SubmissionId!.Value;
        var title = string.IsNullOrWhiteSpace(request.Title)
            ? (kind == JobKindTemplateZip
                ? $"ZIP مرفقات القالب {request.TemplateId}"
                : $"مرفقات الوثيقة {request.SubmissionId}")
            : request.Title!.Trim();

        var row = new AttachmentPdfJob
        {
            OwnerKey = BuildOwnerKey(userId.Value),
            SubmissionId = resolvedSubmissionId,
            Title = title,
            AttachmentUrlsJson = BuildAttachmentPayloadJson(kind, request.TemplateId, urls, submissionGroups),
            Status = "queued",
            Progress = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        _db.AttachmentPdfJobs.Add(row);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<JobDto>.SuccessResponse(ToDto(row), "Job created"));
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<JobDto>>>> List([FromQuery] int limit = 100)
    {
        var userId = HttpContext.GetUserId();
        if (!userId.HasValue)
            return Unauthorized(ApiResponse<List<JobDto>>.ErrorResponse("Unauthorized"));

        limit = Math.Clamp(limit, 1, 200);
        var ownerKey = BuildOwnerKey(userId.Value);
        var rows = await _db.AttachmentPdfJobs
            .AsNoTracking()
            .Where(x => x.OwnerKey == ownerKey)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(ApiResponse<List<JobDto>>.SuccessResponse(rows.Select(x => ToDto(x)).ToList()));
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<JobDto>>> GetOne(Guid id)
    {
        var userId = HttpContext.GetUserId();
        if (!userId.HasValue)
            return Unauthorized(ApiResponse<JobDto>.ErrorResponse("Unauthorized"));

        var ownerKey = BuildOwnerKey(userId.Value);
        var row = await _db.AttachmentPdfJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.OwnerKey == ownerKey);
        if (row == null) return NotFound(ApiResponse<JobDto>.ErrorResponse("Job not found"));
        return Ok(ApiResponse<JobDto>.SuccessResponse(ToDto(row, includeInternal: true)));
    }

    [HttpPatch("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<JobDto>>> UpdateOwned(Guid id, [FromBody] UpdateJobStatusRequest request)
    {
        var userId = HttpContext.GetUserId();
        if (!userId.HasValue)
            return Unauthorized(ApiResponse<JobDto>.ErrorResponse("Unauthorized"));

        var ownerKey = BuildOwnerKey(userId.Value);
        var row = await _db.AttachmentPdfJobs.FirstOrDefaultAsync(x => x.Id == id && x.OwnerKey == ownerKey);
        if (row == null) return NotFound(ApiResponse<JobDto>.ErrorResponse("Job not found"));

        if (!string.IsNullOrWhiteSpace(request.Status)) row.Status = request.Status.Trim().ToLowerInvariant();
        if (request.Progress.HasValue) row.Progress = Math.Clamp(request.Progress.Value, 0, 100);
        if (request.ErrorMessage != null) row.ErrorMessage = request.ErrorMessage;
        if (request.FilePath != null) row.FilePath = request.FilePath;
        if (request.FileName != null) row.FileName = request.FileName;
        if (request.FileSizeBytes.HasValue) row.FileSizeBytes = request.FileSizeBytes;
        if (request.CompletedAt.HasValue) row.CompletedAt = request.CompletedAt;
        row.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<JobDto>.SuccessResponse(ToDto(row, includeInternal: true), "Job updated"));
    }

    [HttpGet("internal/pending")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<JobDto>>>> InternalPending()
    {
        var key = Request.Headers["X-Attachment-Pdf-Internal-Key"].FirstOrDefault();
        var expected = _configuration["AttachmentPdfJobs:InternalApiKey"];
        if (string.IsNullOrWhiteSpace(expected) || key != expected)
            return Unauthorized(ApiResponse<List<JobDto>>.ErrorResponse("Unauthorized internal access"));

        var rows = await _db.AttachmentPdfJobs
            .AsNoTracking()
            .Where(x => x.Status == "queued" || x.Status == "processing")
            .OrderBy(x => x.CreatedAt)
            .Take(500)
            .ToListAsync();

        return Ok(ApiResponse<List<JobDto>>.SuccessResponse(rows.Select(x => ToDto(x, includeInternal: true)).ToList()));
    }

    [HttpPatch("internal/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<JobDto>>> InternalUpdate(Guid id, [FromBody] UpdateJobStatusRequest request)
    {
        var key = Request.Headers["X-Attachment-Pdf-Internal-Key"].FirstOrDefault();
        var expected = _configuration["AttachmentPdfJobs:InternalApiKey"];
        if (string.IsNullOrWhiteSpace(expected) || key != expected)
            return Unauthorized(ApiResponse<JobDto>.ErrorResponse("Unauthorized internal access"));

        var row = await _db.AttachmentPdfJobs.FirstOrDefaultAsync(x => x.Id == id);
        if (row == null) return NotFound(ApiResponse<JobDto>.ErrorResponse("Job not found"));

        if (!string.IsNullOrWhiteSpace(request.Status)) row.Status = request.Status.Trim().ToLowerInvariant();
        if (request.Progress.HasValue) row.Progress = Math.Clamp(request.Progress.Value, 0, 100);
        if (request.ErrorMessage != null) row.ErrorMessage = request.ErrorMessage;
        if (request.FilePath != null) row.FilePath = request.FilePath;
        if (request.FileName != null) row.FileName = request.FileName;
        if (request.FileSizeBytes.HasValue) row.FileSizeBytes = request.FileSizeBytes;
        if (request.CompletedAt.HasValue) row.CompletedAt = request.CompletedAt;
        row.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<JobDto>.SuccessResponse(ToDto(row, includeInternal: true), "Job updated"));
    }

    [HttpGet("internal/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<JobDto>>> InternalGetOne(Guid id)
    {
        var key = Request.Headers["X-Attachment-Pdf-Internal-Key"].FirstOrDefault();
        var expected = _configuration["AttachmentPdfJobs:InternalApiKey"];
        if (string.IsNullOrWhiteSpace(expected) || key != expected)
            return Unauthorized(ApiResponse<JobDto>.ErrorResponse("Unauthorized internal access"));

        var row = await _db.AttachmentPdfJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (row == null) return NotFound(ApiResponse<JobDto>.ErrorResponse("Job not found"));
        return Ok(ApiResponse<JobDto>.SuccessResponse(ToDto(row, includeInternal: true)));
    }
}
