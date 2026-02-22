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
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly IHubContext<BoardHub> _hubContext;

    public TasksController(ITaskService taskService, IHubContext<BoardHub> hubContext)
    {
        _taskService = taskService;
        _hubContext = hubContext;
    }



    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        var task = await _taskService.CreateTaskAsync(dto, GetUserId());

        // Notify all clients viewing the board
        await _hubContext.Clients.Group($"board_{task.BoardId}")
            .SendAsync("TaskCreated", task);

        return CreatedAtAction(null, new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
    {
        try
        {
            var task = await _taskService.UpdateTaskAsync(id, dto, GetUserId());
            if (task == null) return NotFound();

            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);

            return Ok(task);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController] Error updating task {id}: {ex.Message}");
            return BadRequest(new { message = "Failed to update task", details = ex.Message });
        }
    }

    [HttpPut("{id}/move")]
    public async Task<IActionResult> MoveTask(int id, [FromBody] MoveTaskDto dto)
    {
        var task = await _taskService.MoveTaskAsync(id, dto, GetUserId());
        if (task == null) return NotFound();

        // Notify all clients on the board
        await _hubContext.Clients.Group($"board_{task.BoardId}")
            .SendAsync("TaskMoved", task);

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        // DeleteTaskAsync now returns the BoardId if successful
        var boardId = await _taskService.DeleteTaskAsync(id, GetUserId());
        if (boardId == null) return NotFound();

        await _hubContext.Clients.Group($"board_{boardId}")
            .SendAsync("TaskDeleted", id);

        return NoContent();
    }

    [HttpPost("{taskId}/subtasks")]
    public async Task<IActionResult> CreateSubtask(int taskId, [FromBody] CreateSubtaskDto dto)
    {
        var subtask = await _taskService.CreateSubtaskAsync(taskId, dto, GetUserId());
        if (subtask == null) return NotFound();

        // Hack: We need the boardId to notify the group. 
        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task != null)
        {
             await _hubContext.Clients.Group($"board_{task.BoardId}")
            .SendAsync("TaskUpdated", task); 
        }

        return Ok(subtask);
    }

    [HttpPut("subtasks/{subtaskId}")]
    public async Task<IActionResult> UpdateSubtask(int subtaskId, [FromBody] UpdateSubtaskDto dto)
    {
        var subtask = await _taskService.UpdateSubtaskAsync(subtaskId, dto, GetUserId());
        if (subtask == null) return NotFound();

        // Get Task to notify
        var task = await _taskService.GetTaskByIdAsync(subtask.TaskCardId);
        if (task != null)
        {
             await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Ok(subtask);
    }

    [HttpDelete("subtasks/{subtaskId}")]
    public async Task<IActionResult> DeleteSubtask(int subtaskId)
    {
        var result = await _taskService.DeleteSubtaskAsync(subtaskId, GetUserId());
        if (!result) return NotFound();

        return NoContent();
    }

    [HttpGet("{taskId}/activities")]
    public async Task<IActionResult> GetTaskActivities(int taskId)
    {
        var activities = await _taskService.GetTaskActivitiesAsync(taskId);
        return Ok(activities);
    }

    [HttpPost("{taskId}/comments")]
    public async Task<IActionResult> CreateComment(int taskId, [FromBody] AddCommentDto dto)
    {
        var activity = await _taskService.AddCommentAsync(taskId, dto.Text, GetUserId());

        // Notify clients to append to the activity log directly
        // Better yet, just emit TaskUpdated to reload activities on frontend
        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Ok(activity);
    }

    [HttpPost("{id}/labels")]
    public async Task<IActionResult> SetLabels(int id, [FromBody] List<int> labelIds)
    {
        var result = await _taskService.SetTaskLabelsAsync(id, labelIds, GetUserId());
        if (!result) return NotFound();

        var task = await _taskService.GetTaskByIdAsync(id);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Ok(task);
    }

    [HttpPost("{id}/labels/{labelId}")]
    public async Task<IActionResult> AddLabel(int id, int labelId)
    {
        var result = await _taskService.AddLabelToTaskAsync(id, labelId, GetUserId());
        if (!result) return NotFound();

        var task = await _taskService.GetTaskByIdAsync(id);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Ok(task);
    }

    [HttpDelete("{id}/labels/{labelId}")]
    public async Task<IActionResult> RemoveLabel(int id, int labelId)
    {
        var result = await _taskService.RemoveLabelFromTaskAsync(id, labelId, GetUserId());
        if (!result) return NotFound();

        var task = await _taskService.GetTaskByIdAsync(id);
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
                      
        if (int.TryParse(idClaim, out int userId))
        {
            return userId;
        }
        return 0;
    }
}
