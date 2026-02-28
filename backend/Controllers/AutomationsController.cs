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
        var rules = await _automationService.GetAutomationsAsync(boardId);
        return Ok(rules);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAutomation(int boardId, [FromBody] CreateAutomationDto dto)
    {
        // Simple validation
        if (string.IsNullOrWhiteSpace(dto.TriggerType) || string.IsNullOrWhiteSpace(dto.ActionType))
        {
            return BadRequest(new { message = "TriggerType and ActionType are required." });
        }

        var rule = await _automationService.CreateAutomationAsync(boardId, dto);
        return CreatedAtAction(null, new { id = rule.Id }, rule);
    }

    [HttpDelete("/api/automations/{automationId}")]
    public async Task<IActionResult> DeleteAutomation(int automationId)
    {
        var deleted = await _automationService.DeleteAutomationAsync(automationId);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
