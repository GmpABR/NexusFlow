using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/tasks/{taskId}/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly ITaskService _taskService;

    public AttachmentsController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAttachments(int taskId)
    {
        var attachments = await _taskService.GetAttachmentsAsync(taskId);
        return Ok(attachments);
    }

    [HttpPost]
    public async Task<IActionResult> AddAttachment(int taskId, [FromBody] CreateAttachmentDto dto)
    {
        var attachment = await _taskService.AddAttachmentAsync(taskId, dto, GetUserId());
        return Created(string.Empty, attachment);
    }

    [HttpDelete("{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int taskId, int attachmentId)
    {
        var result = await _taskService.DeleteAttachmentAsync(attachmentId, GetUserId());
        if (!result) return NotFound();
        return NoContent();
    }

    private int GetUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value
                      ?? User.FindFirst("id")?.Value;
        if (int.TryParse(idClaim, out int userId)) return userId;
        return 0;
    }
}
