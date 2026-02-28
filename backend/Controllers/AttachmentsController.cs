using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Backend.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Controllers;

[ApiController]
[Route("api/tasks/{taskId}/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly IHubContext<BoardHub> _hubContext;

    public AttachmentsController(ITaskService taskService, IHubContext<BoardHub> hubContext)
    {
        _taskService = taskService;
        _hubContext = hubContext;
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

        // Notify board
        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Created(string.Empty, attachment);
    }

    [HttpDelete("{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int taskId, int attachmentId)
    {
        var result = await _taskService.DeleteAttachmentAsync(attachmentId, GetUserId());
        if (!result) return NotFound();

        // Notify board
        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

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
