using System.IdentityModel.Tokens.Jwt;
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
    private readonly IAutomationService _automationService;

    public TasksController(ITaskService taskService, IHubContext<BoardHub> hubContext, IAutomationService automationService)
    {
        _taskService = taskService;
        _hubContext = hubContext;
        _automationService = automationService;
    }



    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        Console.WriteLine($"[TasksController] CREATE TASK RECEIVED: Title={dto.Title}");
        Console.WriteLine($"[TasksController] -> Desc Length: {dto.Description?.Length ?? 0}");
        Console.WriteLine($"[TasksController] -> Desc Snippet: {dto.Description?.Substring(0, Math.Min(dto.Description?.Length ?? 0, 100))}");
        
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
        int userId = GetUserId();
        var task = await _taskService.MoveTaskAsync(id, dto, userId);
        if (task == null) return NotFound();

        // 1. Notify all clients on the board that the task moved columns
        await _hubContext.Clients.Group($"board_{task.BoardId}")
            .SendAsync("TaskMoved", task);

        // 2. Execute automations and check if they modified the task natively
        try 
        {
            bool wasModified = await _automationService.ExecuteTaskMovedAutomationsAsync(task.BoardId, task.Id, dto.TargetColumnId, userId);
            
            // 3. Since automations might have changed the task (assigned user, completed subtasks)
            // if it was truly modified, fetch the latest task state and emit a TaskUpdated to sync clients.
            if (wasModified)
            {
                var updatedTask = await _taskService.GetTaskByIdAsync(task.Id);
                if (updatedTask != null)
                {
                    await _hubContext.Clients.Group($"board_{task.BoardId}")
                        .SendAsync("TaskUpdated", updatedTask);
                    return Ok(updatedTask);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController] Automations failed for task {id}: {ex.Message}");
        }

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
        // Fetch subtask before deletion to get TaskCardId for SignalR
        var subtask = await _taskService.GetSubtaskByIdAsync(subtaskId);
        if (subtask == null) return NotFound();

        var result = await _taskService.DeleteSubtaskAsync(subtaskId, GetUserId());
        if (!result) return NotFound();

        // Notify board
        var task = await _taskService.GetTaskByIdAsync(subtask.TaskCardId);
        if (task != null)
        {
             await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

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

    [HttpDelete("activities/{activityId}")]
    public async Task<IActionResult> DeleteComment(int activityId)
    {
        var activity = await _taskService.GetActivityByIdAsync(activityId);
        if (activity == null) return NotFound();

        var result = await _taskService.DeleteActivityAsync(activityId, GetUserId());
        if (!result) return Forbid();

        // Notify board
        var task = await _taskService.GetTaskByIdAsync(activity.TaskCardId);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return NoContent();
    }

    [HttpPut("activities/{activityId}")]
    public async Task<IActionResult> UpdateComment(int activityId, [FromBody] AddCommentDto dto)
    {
        var activity = await _taskService.UpdateActivityAsync(activityId, dto.Text, GetUserId());
        if (activity == null) return Forbid();

        // Notify board
        var task = await _taskService.GetTaskByIdAsync(activity.TaskCardId);
        if (task != null)
        {
            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);
        }

        return Ok(activity);
    }

    [HttpPost("activities/{activityId}/reactions")]
    public async Task<IActionResult> ToggleReaction(int activityId, [FromBody] ToggleReactionDto dto)
    {
        var reaction = await _taskService.ToggleReactionAsync(activityId, dto.Emoji, GetUserId());
        
        // Notify board so reactions sync in real-time
        var activity = await _taskService.GetActivityByIdAsync(activityId);
        if (activity != null)
        {
            var task = await _taskService.GetTaskByIdAsync(activity.TaskCardId);
            if (task != null)
            {
                await _hubContext.Clients.Group($"board_{task.BoardId}")
                    .SendAsync("TaskUpdated", task);
            }
        }
        
        return Ok(reaction);
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
        var claims = User.Claims.Select(c => $"{c.Type}: {c.Value}");
        Console.WriteLine($"[TasksController] User Claims: {string.Join(", ", claims)}");

        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                      ?? User.FindFirst("sub")?.Value 
                      ?? User.FindFirst("id")?.Value
                      ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                      
        if (int.TryParse(idClaim, out int userId))
        {
            Console.WriteLine($"[TasksController] Extracted UserId: {userId}");
            return userId;
        }
        
        Console.WriteLine("[TasksController] WARNING: UserId claim not found or not an integer.");
        return 0;
    }
}
