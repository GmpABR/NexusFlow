using System.Security.Claims;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimeLogsController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly IHubContext<BoardHub> _hubContext;

    public TimeLogsController(ITaskService taskService, IHubContext<BoardHub> hubContext)
    {
        _taskService = taskService;
        _hubContext = hubContext;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartTimer([FromBody] StartTimerDto dto)
    {
        var log = await _taskService.StartTimerAsync(dto.TaskCardId, GetUserId());
        if (log == null) return BadRequest(new { message = "Timer is already running for this task." });

        await NotifyTaskUpdated(dto.TaskCardId);
        return Ok(log);
    }

    [HttpPost("stop")]
    public async Task<IActionResult> StopTimer([FromBody] StopTimerDto dto, [FromQuery] int taskId)
    {
        var log = await _taskService.StopTimerAsync(taskId, GetUserId(), dto.StoppedAt);
        if (log == null) return NotFound(new { message = "No running timer found for this task." });

        await NotifyTaskUpdated(taskId);
        return Ok(log);
    }

    [HttpPost("manual")]
    public async Task<IActionResult> AddManualTimeLog([FromBody] AddManualTimeLogDto dto)
    {
        if (dto.StoppedAt <= dto.StartedAt) return BadRequest("StoppedAt must be after StartedAt.");
        
        var log = await _taskService.AddManualTimeLogAsync(dto.TaskCardId, GetUserId(), dto);
        await NotifyTaskUpdated(dto.TaskCardId);
        return Ok(log);
    }

    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetTaskTimeLogs(int taskId)
    {
        var logs = await _taskService.GetTaskTimeLogsAsync(taskId, GetUserId());
        return Ok(logs);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimeLog(int id)
    {
        var result = await _taskService.DeleteTimeLogAsync(id, GetUserId());
        if (!result) return NotFound();
        return NoContent();
    }

    private async Task NotifyTaskUpdated(int taskId)
    {
        var task = await _taskService.GetTaskByIdAsync(taskId, GetUserId());
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}").SendAsync("TaskUpdated", task);
        }
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
