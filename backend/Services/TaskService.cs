using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<TaskCardDto> CreateTaskAsync(CreateTaskDto dto)
    {
        var maxOrder = await _db.TaskCards
            .Where(t => t.ColumnId == dto.ColumnId)
            .MaxAsync(t => (int?)t.Order) ?? -1;

        var task = new TaskCard
        {
            Title = dto.Title,
            Description = dto.Description,
            ColumnId = dto.ColumnId,
            Order = maxOrder + 1,
            Priority = dto.Priority,
            DueDate = dto.DueDate.HasValue ? DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Utc) : null,
            StoryPoints = dto.StoryPoints,
            AssigneeId = dto.AssigneeId,
            Tags = dto.Tags
        };

        _db.TaskCards.Add(task);
        await _db.SaveChangesAsync();

        return await MapToDto(task);
    }

    public async Task<TaskCardDto?> UpdateTaskAsync(int taskId, UpdateTaskDto dto)
    {
        var task = await _db.TaskCards
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == taskId);
            
        if (task == null) return null;

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        
        // PostgreSQL requires UTC for 'timestamp with time zone' columns
        if (dto.DueDate.HasValue)
        {
            task.DueDate = DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Utc);
        }
        else
        {
            task.DueDate = null;
        }

        task.StoryPoints = dto.StoryPoints;
        task.AssigneeId = (dto.AssigneeId == 0) ? null : dto.AssigneeId;
        task.Tags = dto.Tags;

        await _db.SaveChangesAsync();
        
        // Reload to get assignee info if changed
        if (task.AssigneeId.HasValue && task.Assignee == null)
        {
            await _db.Entry(task).Reference(t => t.Assignee).LoadAsync();
        }

        return await MapToDto(task);
    }

    public async Task<TaskCardDto?> MoveTaskAsync(int taskId, MoveTaskDto dto)
    {
        Console.WriteLine($"[MoveTask] Moving Task {taskId} to Column {dto.TargetColumnId} at Order {dto.NewOrder}");
        var task = await _db.TaskCards.FindAsync(taskId);
        if (task == null) return null;

        // 1. Get all tasks in the target column (excluding the moved task)
        var targetColumnTasks = await _db.TaskCards
            .Where(t => t.ColumnId == dto.TargetColumnId && t.Id != taskId)
            .OrderBy(t => t.Order)
            .ToListAsync();

        // 2. Insert the moved task at the new position
        // Clamp index to be safe
        int newIndex = Math.Max(0, Math.Min(dto.NewOrder, targetColumnTasks.Count));
        
        task.ColumnId = dto.TargetColumnId;
        
        targetColumnTasks.Insert(newIndex, task);

        // 3. Update Order for all tasks in the target column
        for (int i = 0; i < targetColumnTasks.Count; i++)
        {
            targetColumnTasks[i].Order = i;
        }

        // 4. (Optional) If moved between columns, we might want to re-normalize the source column too, 
        // but typically that's not strictly required for visual consistency as long as the target is correct.
        // However, it's good practice to avoid "holes" in the source column eventually. 
        // For now, focusing on target consistency is enough to fix the "jump" and persistence.

        await _db.SaveChangesAsync();

        return await MapToDto(task);
    }

    public async Task<int?> DeleteTaskAsync(int taskId)
    {
        var task = await _db.TaskCards
            .Include(t => t.Column)
            .FirstOrDefaultAsync(t => t.Id == taskId);
            
        if (task == null) return null;

        int boardId = task.Column.BoardId;

        _db.TaskCards.Remove(task);
        await _db.SaveChangesAsync();
        return boardId;
    }

    private async Task<TaskCardDto> MapToDto(TaskCard task)
    {
        // If Assignee is null but ID is set, we might want to load it
        if (task.Assignee == null && task.AssigneeId.HasValue) 
        {
             await _db.Entry(task).Reference(t => t.Assignee).LoadAsync();
        }

        // Ensure Column is loaded to get BoardId
        if (task.Column == null)
        {
            await _db.Entry(task).Reference(t => t.Column).LoadAsync();
        }

        return new TaskCardDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            Order = task.Order,
            ColumnId = task.ColumnId,
            BoardId = task.Column.BoardId,
            CreatedAt = task.CreatedAt,
            Priority = task.Priority,
            DueDate = task.DueDate,
            StoryPoints = task.StoryPoints,
            AssigneeId = task.AssigneeId,
            AssigneeName = task.Assignee?.Username,
            AssigneeAvatar = null, // Placeholder
            Tags = task.Tags
        };
    }
}
