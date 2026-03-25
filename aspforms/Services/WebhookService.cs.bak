using Microsoft.EntityFrameworkCore;
using AutoMapper;
using System.Text;
using System.Text.Json;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class WebhookService : IWebhookService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly HttpClient _httpClient;
    private readonly ILogger<WebhookService> _logger;

    public WebhookService(ApplicationDbContext context, IMapper mapper, HttpClient httpClient, ILogger<WebhookService> logger)
    {
        _context = context;
        _mapper = mapper;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<ApiResponse<List<WebhookEndpointDto>>> GetWebhookEndpointsAsync(int tenantId)
    {
        try
        {
            var webhooks = await _context.WebhookEndpoints
                .Include(w => w.Tenant)
                .Where(w => w.TenantId == tenantId)
                .OrderBy(w => w.Url)
                .ToListAsync();

            var webhookDtos = _mapper.Map<List<WebhookEndpointDto>>(webhooks);
            return ApiResponse<List<WebhookEndpointDto>>.SuccessResponse(webhookDtos, "Webhook endpoints retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<WebhookEndpointDto>>.ErrorResponse($"An error occurred while retrieving webhook endpoints: {ex.Message}");
        }
    }

    public async Task<ApiResponse<WebhookEndpointDto>> GetWebhookEndpointByIdAsync(int id)
    {
        try
        {
            var webhook = await _context.WebhookEndpoints
                .Include(w => w.Tenant)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (webhook == null)
            {
                return ApiResponse<WebhookEndpointDto>.ErrorResponse("Webhook endpoint not found.");
            }

            var webhookDto = _mapper.Map<WebhookEndpointDto>(webhook);
            return ApiResponse<WebhookEndpointDto>.SuccessResponse(webhookDto, "Webhook endpoint retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<WebhookEndpointDto>.ErrorResponse($"An error occurred while retrieving webhook endpoint: {ex.Message}");
        }
    }

    public async Task<ApiResponse<WebhookEndpointDto>> CreateWebhookEndpointAsync(int tenantId, CreateWebhookEndpointDto createWebhookDto)
    {
        try
        {
            // Validate tenant
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null || !tenant.IsActive)
            {
                return ApiResponse<WebhookEndpointDto>.ErrorResponse("Invalid or inactive tenant.");
            }

            var webhook = _mapper.Map<WebhookEndpoint>(createWebhookDto);
            webhook.TenantId = tenantId;

            _context.WebhookEndpoints.Add(webhook);
            await _context.SaveChangesAsync();

            // Reload with tenant information
            webhook = await _context.WebhookEndpoints
                .Include(w => w.Tenant)
                .FirstAsync(w => w.Id == webhook.Id);

            var webhookDto = _mapper.Map<WebhookEndpointDto>(webhook);
            return ApiResponse<WebhookEndpointDto>.SuccessResponse(webhookDto, "Webhook endpoint created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<WebhookEndpointDto>.ErrorResponse($"An error occurred while creating webhook endpoint: {ex.Message}");
        }
    }

    public async Task<ApiResponse<WebhookEndpointDto>> UpdateWebhookEndpointAsync(int id, UpdateWebhookEndpointDto updateWebhookDto)
    {
        try
        {
            var webhook = await _context.WebhookEndpoints
                .Include(w => w.Tenant)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (webhook == null)
            {
                return ApiResponse<WebhookEndpointDto>.ErrorResponse("Webhook endpoint not found.");
            }

            _mapper.Map(updateWebhookDto, webhook);
            await _context.SaveChangesAsync();

            var webhookDto = _mapper.Map<WebhookEndpointDto>(webhook);
            return ApiResponse<WebhookEndpointDto>.SuccessResponse(webhookDto, "Webhook endpoint updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<WebhookEndpointDto>.ErrorResponse($"An error occurred while updating webhook endpoint: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteWebhookEndpointAsync(int id)
    {
        try
        {
            var webhook = await _context.WebhookEndpoints.FindAsync(id);
            if (webhook == null)
            {
                return ApiResponse<bool>.ErrorResponse("Webhook endpoint not found.");
            }

            _context.WebhookEndpoints.Remove(webhook);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Webhook endpoint deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting webhook endpoint: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> ToggleWebhookStatusAsync(int id)
    {
        try
        {
            var webhook = await _context.WebhookEndpoints.FindAsync(id);
            if (webhook == null)
            {
                return ApiResponse<bool>.ErrorResponse("Webhook endpoint not found.");
            }

            webhook.IsActive = !webhook.IsActive;
            webhook.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var status = webhook.IsActive ? "activated" : "deactivated";
            return ApiResponse<bool>.SuccessResponse(true, $"Webhook endpoint {status} successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while toggling webhook status: {ex.Message}");
        }
    }

    public async Task<bool> SendWebhookAsync(int tenantId, object payload, string eventType)
    {
        try
        {
            var webhooks = await _context.WebhookEndpoints
                .Where(w => w.TenantId == tenantId && w.IsActive)
                .ToListAsync();

            if (!webhooks.Any())
            {
                return true; // No webhooks to send
            }

            var webhookPayload = new
            {
                EventType = eventType,
                TenantId = tenantId,
                Timestamp = DateTime.UtcNow,
                Data = payload
            };

            var jsonPayload = JsonSerializer.Serialize(webhookPayload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var tasks = new List<Task>();

            foreach (var webhook in webhooks)
            {
                tasks.Add(SendSingleWebhookAsync(webhook, content));
            }

            await Task.WhenAll(tasks);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending webhooks for tenant {TenantId}", tenantId);
            return false;
        }
    }

    private async Task SendSingleWebhookAsync(WebhookEndpoint webhook, StringContent content)
    {
        try
        {
            using var request = new HttpRequestMessage(
                new HttpMethod(webhook.Method.ToUpper()), 
                webhook.Url)
            {
                Content = content
            };

            // Add custom headers if specified
            if (!string.IsNullOrEmpty(webhook.Headers))
            {
                try
                {
                    var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(webhook.Headers);
                    if (headers != null)
                    {
                        foreach (var header in headers)
                        {
                            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse headers for webhook {WebhookId}", webhook.Id);
                }
            }

            // Set timeout
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var response = await _httpClient.SendAsync(request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Webhook {WebhookId} returned status {StatusCode}: {ReasonPhrase}", 
                    webhook.Id, response.StatusCode, response.ReasonPhrase);
            }
            else
            {
                _logger.LogInformation("Webhook {WebhookId} sent successfully", webhook.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send webhook {WebhookId} to {Url}", webhook.Id, webhook.Url);
        }
    }
}