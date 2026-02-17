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
        var task = await _taskService.CreateTaskAsync(dto);

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
            var task = await _taskService.UpdateTaskAsync(id, dto);
            if (task == null) return NotFound();

            await _hubContext.Clients.Group($"board_{task.BoardId}")
                .SendAsync("TaskUpdated", task);

            return Ok(task);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController] Error updating task {id}: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TasksController] Inner Exception: {ex.InnerException.Message}");
            }
            return BadRequest(new { message = "Failed to update task", details = ex.Message });
        }
    }

    [HttpPut("{id}/move")]
    public async Task<IActionResult> MoveTask(int id, [FromBody] MoveTaskDto dto)
    {
        var task = await _taskService.MoveTaskAsync(id, dto);
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
        var boardId = await _taskService.DeleteTaskAsync(id);
        if (boardId == null) return NotFound();

        await _hubContext.Clients.Group($"board_{boardId}")
            .SendAsync("TaskDeleted", id);

        return NoContent();
    }
}
