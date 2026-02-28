using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/boards/{boardId}/automations")]
[Authorize]
public class AutomationsController : ControllerBase
{
    private readonly IAutomationService _automationService;

    public AutomationsController(IAutomationService automationService)
    {
        _automationService = automationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAutomations(int boardId)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        try
        {
            var rules = await _automationService.GetAutomationsAsync(boardId, userId);
            return Ok(rules);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAutomation(int boardId, [FromBody] CreateAutomationDto dto)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        // Simple validation
        if (string.IsNullOrWhiteSpace(dto.TriggerType) || string.IsNullOrWhiteSpace(dto.ActionType))
        {
            return BadRequest(new { message = "TriggerType and ActionType are required." });
        }

        try
        {
            var rule = await _automationService.CreateAutomationAsync(boardId, dto, userId);
            return CreatedAtAction(null, new { id = rule.Id }, rule);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpDelete("/api/automations/{automationId}")]
    public async Task<IActionResult> DeleteAutomation(int automationId)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        try
        {
            var deleted = await _automationService.DeleteAutomationAsync(automationId, userId);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }
}
