using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IWebhookService
{
    Task<ApiResponse<List<WebhookEndpointDto>>> GetWebhookEndpointsAsync(int tenantId);
    Task<ApiResponse<WebhookEndpointDto>> GetWebhookEndpointByIdAsync(int id);
    Task<ApiResponse<WebhookEndpointDto>> CreateWebhookEndpointAsync(int tenantId, CreateWebhookEndpointDto createWebhookDto);
    Task<ApiResponse<WebhookEndpointDto>> UpdateWebhookEndpointAsync(int id, UpdateWebhookEndpointDto updateWebhookDto);
    Task<ApiResponse<bool>> DeleteWebhookEndpointAsync(int id);
    Task<ApiResponse<bool>> ToggleWebhookStatusAsync(int id);
    Task<bool> SendWebhookAsync(int tenantId, object payload, string eventType);
}