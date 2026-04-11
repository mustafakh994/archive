using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WebhooksController : ControllerBase
{
    private readonly IWebhookService _webhookService;

    public WebhooksController(IWebhookService webhookService)
    {
        _webhookService = webhookService;
    }

    /// <summary>
    /// Get webhook endpoints for a tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<WebhookEndpointDto>>>> GetWebhookEndpoints()
    {
        var tenantId = HttpContext.GetTenantId();
        if (!tenantId.HasValue && !HttpContext.IsSuperAdmin())
        {
            return Forbid("You must be associated with a tenant to view webhook endpoints.");
        }

        // SuperAdmin needs to specify tenant via query parameter
        if (HttpContext.IsSuperAdmin() && !tenantId.HasValue)
        {
            if (!int.TryParse(Request.Query["tenantId"], out var queryTenantId))
            {
                return BadRequest("SuperAdmin must specify tenantId query parameter.");
            }
            tenantId = queryTenantId;
        }

        var result = await _webhookService.GetWebhookEndpointsAsync(tenantId!.Value);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get webhook endpoint by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<WebhookEndpointDto>>> GetWebhookEndpoint(int id)
    {
        var result = await _webhookService.GetWebhookEndpointByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        // Check authorization - users can only view webhooks from their tenant (except SuperAdmin)
        if (!HttpContext.IsSuperAdmin())
        {
            var userTenantId = HttpContext.GetTenantId();
            if (result.Data!.TenantId != userTenantId)
            {
                return Forbid("You can only access webhook endpoints from your tenant.");
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new webhook endpoint (TenantAdmin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,TenantAdmin")]
    public async Task<ActionResult<ApiResponse<WebhookEndpointDto>>> CreateWebhookEndpoint([FromBody] CreateWebhookEndpointDto createWebhookDto)
    {
        var tenantId = HttpContext.GetTenantId();
        if (!tenantId.HasValue && !HttpContext.IsSuperAdmin())
        {
            return Forbid("You must be associated with a tenant to create webhook endpoints.");
        }

        // SuperAdmin must specify tenant via request body or query parameter
        if (HttpContext.IsSuperAdmin() && !tenantId.HasValue)
        {
            if (!int.TryParse(Request.Query["tenantId"], out var queryTenantId))
            {
                return BadRequest("SuperAdmin must specify tenantId query parameter.");
            }
            tenantId = queryTenantId;
        }

        var result = await _webhookService.CreateWebhookEndpointAsync(tenantId!.Value, createWebhookDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetWebhookEndpoint), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update webhook endpoint (TenantAdmin)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin")]
    public async Task<ActionResult<ApiResponse<WebhookEndpointDto>>> UpdateWebhookEndpoint(int id, [FromBody] UpdateWebhookEndpointDto updateWebhookDto)
    {
        // Get current webhook info to check authorization
        var currentWebhookResult = await _webhookService.GetWebhookEndpointByIdAsync(id);
        if (!currentWebhookResult.Success)
        {
            return NotFound(currentWebhookResult);
        }

        // TenantAdmin can only update webhooks in their own tenant
        if (!HttpContext.IsSuperAdmin())
        {
            var userTenantId = HttpContext.GetTenantId();
            if (currentWebhookResult.Data!.TenantId != userTenantId)
            {
                return Forbid("You can only update webhook endpoints in your own tenant.");
            }
        }

        var result = await _webhookService.UpdateWebhookEndpointAsync(id, updateWebhookDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete webhook endpoint (TenantAdmin)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteWebhookEndpoint(int id)
    {
        // Get current webhook info to check authorization
        var currentWebhookResult = await _webhookService.GetWebhookEndpointByIdAsync(id);
        if (!currentWebhookResult.Success)
        {
            return NotFound(currentWebhookResult);
        }

        // TenantAdmin can only delete webhooks in their own tenant
        if (!HttpContext.IsSuperAdmin())
        {
            var userTenantId = HttpContext.GetTenantId();
            if (currentWebhookResult.Data!.TenantId != userTenantId)
            {
                return Forbid("You can only delete webhook endpoints in your own tenant.");
            }
        }

        var result = await _webhookService.DeleteWebhookEndpointAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Toggle webhook endpoint active status (TenantAdmin)
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleWebhookStatus(int id)
    {
        // Get current webhook info to check authorization
        var currentWebhookResult = await _webhookService.GetWebhookEndpointByIdAsync(id);
        if (!currentWebhookResult.Success)
        {
            return NotFound(currentWebhookResult);
        }

        // TenantAdmin can only toggle webhooks in their own tenant
        if (!HttpContext.IsSuperAdmin())
        {
            var userTenantId = HttpContext.GetTenantId();
            if (currentWebhookResult.Data!.TenantId != userTenantId)
            {
                return Forbid("You can only manage webhook endpoints in your own tenant.");
            }
        }

        var result = await _webhookService.ToggleWebhookStatusAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}