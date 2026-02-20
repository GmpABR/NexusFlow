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

    public async Task<TaskCardDto> CreateTaskAsync(CreateTaskDto dto, int userId)
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

        await LogActivity(task.Id, userId, "Created", $"Task created in column {task.ColumnId}");

        return await MapToDto(task);
    }

    public async Task<TaskCardDto?> UpdateTaskAsync(int taskId, UpdateTaskDto dto, int userId)
    {
        var task = await _db.TaskCards
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == taskId);
            
        if (task == null) return null;

        var changes = new List<string>();
        if (task.Title != dto.Title) changes.Add($"Title changed to '{dto.Title}'");
        if (task.Priority != dto.Priority) changes.Add($"Priority changed to '{dto.Priority}'");
        if (task.Description != dto.Description) changes.Add("Description updated");

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        
        if (dto.DueDate.HasValue)
            task.DueDate = DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Utc);
        else
            task.DueDate = null;

        task.StoryPoints = dto.StoryPoints;
        task.AssigneeId = (dto.AssigneeId == 0) ? null : dto.AssigneeId;
        task.Tags = dto.Tags;

        await _db.SaveChangesAsync();
        
        if (changes.Any())
        {
             await LogActivity(taskId, userId, "Updated", string.Join(", ", changes));
        }

        // Reload to get assignee info if changed
        if (task.AssigneeId.HasValue && task.Assignee == null)
        {
            await _db.Entry(task).Reference(t => t.Assignee).LoadAsync();
        }

        return await MapToDto(task);
    }

    public async Task<TaskCardDto?> MoveTaskAsync(int taskId, MoveTaskDto dto, int userId)
    {
        Console.WriteLine($"[MoveTask] Moving Task {taskId} to Column {dto.TargetColumnId} at Order {dto.NewOrder}");
        var task = await _db.TaskCards.FindAsync(taskId);
        if (task == null) return null;

        int oldColumnId = task.ColumnId;
        
        // 1. Get all tasks in the target column (excluding the moved task)
        var targetColumnTasks = await _db.TaskCards
            .Where(t => t.ColumnId == dto.TargetColumnId && t.Id != taskId)
            .OrderBy(t => t.Order)
            .ToListAsync();

        // 2. Insert the moved task at the new position
        int newIndex = Math.Max(0, Math.Min(dto.NewOrder, targetColumnTasks.Count));
        
        task.ColumnId = dto.TargetColumnId;
        
        targetColumnTasks.Insert(newIndex, task);

        // 3. Update Order for all tasks in the target column
        for (int i = 0; i < targetColumnTasks.Count; i++)
        {
            targetColumnTasks[i].Order = i;
        }

        await _db.SaveChangesAsync();

        if (oldColumnId != dto.TargetColumnId)
        {
             await LogActivity(taskId, userId, "Moved", $"Moved to column {dto.TargetColumnId}");
        }
        else
        {
             await LogActivity(taskId, userId, "Reordered", "Reordered within same column");
        }

        return await MapToDto(task);
    }

    public async Task<int?> DeleteTaskAsync(int taskId, int userId)
    {
        var task = await _db.TaskCards
            .Include(t => t.Column)
            .FirstOrDefaultAsync(t => t.Id == taskId);
            
        if (task == null) return null;

        int boardId = task.Column.BoardId;
        
        // Log before delete? Or just delete. 
        // If we delete the task, cascade deletes activities. 
        // So logging a delete on a deleted task is pointless unless we have a BoardActivity log.
        // For now, just delete.

        _db.TaskCards.Remove(task);
        await _db.SaveChangesAsync();
        return boardId;
    }

    // Subtask Methods
    public async Task<SubtaskDto> CreateSubtaskAsync(int taskId, CreateSubtaskDto dto, int userId)
    {
        var subtask = new Subtask
        {
            TaskCardId = taskId,
            Title = dto.Title,
            IsCompleted = false
        };

        _db.Subtasks.Add(subtask);
        await _db.SaveChangesAsync();
        
        await LogActivity(taskId, userId, "Subtask Added", $"Added subtask: {dto.Title}");

        return new SubtaskDto { Id = subtask.Id, Title = subtask.Title, IsCompleted = subtask.IsCompleted, TaskCardId = subtask.TaskCardId };
    }

    public async Task<SubtaskDto?> UpdateSubtaskAsync(int subtaskId, UpdateSubtaskDto dto, int userId)
    {
        var subtask = await _db.Subtasks.FindAsync(subtaskId);
        if (subtask == null) return null;

        if (dto.Title != null) subtask.Title = dto.Title;
        
        bool statusChanged = false;
        if (dto.IsCompleted.HasValue && dto.IsCompleted != subtask.IsCompleted)
        {
            subtask.IsCompleted = dto.IsCompleted.Value;
            statusChanged = true;
        }

        await _db.SaveChangesAsync();
        
        if (statusChanged)
        {
            string status = subtask.IsCompleted ? "completed" : "uncompleted";
            await LogActivity(subtask.TaskCardId, userId, "Subtask Updated", $"Marked subtask '{subtask.Title}' as {status}");
        }

        return new SubtaskDto { Id = subtask.Id, Title = subtask.Title, IsCompleted = subtask.IsCompleted, TaskCardId = subtask.TaskCardId };
    }

    public async Task<bool> DeleteSubtaskAsync(int subtaskId, int userId)
    {
        var subtask = await _db.Subtasks.FindAsync(subtaskId);
        if (subtask == null) return false;
        
        int taskId = subtask.TaskCardId;
        string title = subtask.Title;

        _db.Subtasks.Remove(subtask);
        await _db.SaveChangesAsync();
        
        await LogActivity(taskId, userId, "Subtask Deleted", $"Deleted subtask: {title}");
        
        return true;
    }

    public async Task<TaskCardDto?> GetTaskByIdAsync(int taskId)
    {
        return await _db.TaskCards
            .AsNoTracking()
            .Where(t => t.Id == taskId)
            .Select(t => new TaskCardDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Order = t.Order,
                ColumnId = t.ColumnId,
                BoardId = t.Column.BoardId,
                CreatedAt = t.CreatedAt,
                Priority = t.Priority,
                DueDate = t.DueDate,
                StoryPoints = t.StoryPoints,
                AssigneeId = t.AssigneeId,
                AssigneeName = t.Assignee != null ? t.Assignee.Username : null,
                AssigneeAvatar = null,
                Tags = t.Tags,
                TotalTimeSpentMinutes = t.TimeLogs.Where(tl => tl.DurationMinutes.HasValue).Sum(tl => tl.DurationMinutes!.Value),
                IsTimerRunning = t.TimeLogs.Any(tl => tl.StoppedAt == null),
                Subtasks = t.Subtasks.OrderBy(s => s.Id).Select(s => new SubtaskDto 
                { 
                    Id = s.Id, 
                    Title = s.Title, 
                    IsCompleted = s.IsCompleted,
                    TaskCardId = s.TaskCardId
                }).ToList()
            })
            .FirstOrDefaultAsync();
    }
    
    public async Task<List<TaskActivity>> GetTaskActivitiesAsync(int taskId)
    {
        return await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCardId == taskId)
            .Include(a => a.User)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    public async Task<TaskActivity> AddCommentAsync(int taskId, string text, int userId)
    {
        var activity = new TaskActivity
        {
            TaskCardId = taskId,
            UserId = userId,
            Action = "Commented",
            Details = text,
            Timestamp = DateTime.UtcNow
        };
        
        _db.TaskActivities.Add(activity);
        await _db.SaveChangesAsync();

        // Load the User so we can return the username/avatar
        await _db.Entry(activity).Reference(a => a.User).LoadAsync();

        return activity;
    }

    // Time Tracking Methods
    public async Task<TimeLogDto?> StartTimerAsync(int taskId, int userId)
    {
        // Check if there's already a running timer for this user on this task
        var existingLog = await _db.TimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskCardId == taskId && tl.UserId == userId && tl.StoppedAt == null);

        if (existingLog != null) return null; // Timer already running

        var timeLog = new TimeLog
        {
            TaskCardId = taskId,
            UserId = userId,
            StartedAt = DateTime.UtcNow
        };

        _db.TimeLogs.Add(timeLog);
        await _db.SaveChangesAsync();

        await LogActivity(taskId, userId, "Timer Started", "Started time tracking");

        return await MapToTimeLogDto(timeLog);
    }

    public async Task<TimeLogDto?> StopTimerAsync(int taskId, int userId, DateTime? stoppedAt = null)
    {
        var timeLog = await _db.TimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskCardId == taskId && tl.UserId == userId && tl.StoppedAt == null);

        if (timeLog == null) return null;

        timeLog.StoppedAt = stoppedAt ?? DateTime.UtcNow;
        var duration = timeLog.StoppedAt.Value - timeLog.StartedAt;
        timeLog.DurationMinutes = (int)Math.Max(1, Math.Round(duration.TotalMinutes)); // At least 1 minute

        await _db.SaveChangesAsync();

        await LogActivity(taskId, userId, "Timer Stopped", $"Logged {timeLog.DurationMinutes} minutes");

        return await MapToTimeLogDto(timeLog);
    }

    public async Task<TimeLogDto> AddManualTimeLogAsync(int taskId, int userId, AddManualTimeLogDto dto)
    {
        var duration = dto.StoppedAt - dto.StartedAt;
        int durationMinutes = (int)Math.Max(1, Math.Round(duration.TotalMinutes));

        var timeLog = new TimeLog
        {
            TaskCardId = taskId,
            UserId = userId,
            StartedAt = dto.StartedAt,
            StoppedAt = dto.StoppedAt,
            DurationMinutes = durationMinutes
        };

        _db.TimeLogs.Add(timeLog);
        await _db.SaveChangesAsync();

        await LogActivity(taskId, userId, "Time Logged Manually", $"Manually logged {durationMinutes} minutes");

        return await MapToTimeLogDto(timeLog);
    }

    public async Task<bool> DeleteTimeLogAsync(int timeLogId, int userId)
    {
        var timeLog = await _db.TimeLogs.FindAsync(timeLogId);
        if (timeLog == null) return false;

        // Optionally check if userId matches, or if user is admin. For now, just delete.
        int taskId = timeLog.TaskCardId;
        int duration = timeLog.DurationMinutes ?? 0;

        _db.TimeLogs.Remove(timeLog);
        await _db.SaveChangesAsync();

        await LogActivity(taskId, userId, "Time Log Deleted", $"Deleted time log of {duration} minutes");

        return true;
    }

    public async Task<List<TimeLogDto>> GetTaskTimeLogsAsync(int taskId)
    {
        var logs = await _db.TimeLogs
            .Include(tl => tl.User)
            .Where(tl => tl.TaskCardId == taskId)
            .OrderByDescending(tl => tl.StartedAt)
            .ToListAsync();

        return logs.Select(tl => new TimeLogDto
        {
            Id = tl.Id,
            TaskCardId = tl.TaskCardId,
            UserId = tl.UserId,
            UserName = tl.User?.Username,
            StartedAt = tl.StartedAt,
            StoppedAt = tl.StoppedAt,
            DurationMinutes = tl.DurationMinutes
        }).ToList();
    }

    private async Task<TimeLogDto> MapToTimeLogDto(TimeLog timeLog)
    {
        if (timeLog.User == null)
        {
            await _db.Entry(timeLog).Reference(tl => tl.User).LoadAsync();
        }

        return new TimeLogDto
        {
            Id = timeLog.Id,
            TaskCardId = timeLog.TaskCardId,
            UserId = timeLog.UserId,
            UserName = timeLog.User?.Username,
            StartedAt = timeLog.StartedAt,
            StoppedAt = timeLog.StoppedAt,
            DurationMinutes = timeLog.DurationMinutes
        };
    }
    
    private async Task LogActivity(int taskId, int userId, string action, string details)
    {
        if (userId == 0) return; // System action or unauthenticated?

        var activity = new TaskActivity
        {
            TaskCardId = taskId,
            UserId = userId,
            Action = action,
            Details = details,
            Timestamp = DateTime.UtcNow
        };
        
        _db.TaskActivities.Add(activity);
        await _db.SaveChangesAsync();
    }

    private async Task<TaskCardDto> MapToDto(TaskCard task)
    {
        // If Assignee is null but ID is set, we might want to load it
        if (task.Assignee == null && task.AssigneeId.HasValue) 
        {
             await _db.Entry(task).Reference(t => t.Assignee).LoadAsync();
        }

        // Ensure Column is loaded to get BoardId (if not already loaded)
        if (task.Column == null)
        {
            await _db.Entry(task).Reference(t => t.Column).LoadAsync();
        }

        // Ensure Subtasks are loaded if they weren't included in the query
        if (task.Subtasks == null) 
        {
            await _db.Entry(task).Collection(t => t.Subtasks).LoadAsync();
        }

        // Ensure TimeLogs are loaded for calculation
        if (task.TimeLogs == null)
        {
            await _db.Entry(task).Collection(t => t.TimeLogs).LoadAsync();
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
            Tags = task.Tags,
            TotalTimeSpentMinutes = task.TimeLogs.Where(tl => tl.DurationMinutes.HasValue).Sum(tl => tl.DurationMinutes!.Value),
            IsTimerRunning = task.TimeLogs.Any(tl => tl.StoppedAt == null),
            Subtasks = task.Subtasks.Select(s => new SubtaskDto 
            { 
                Id = s.Id, 
                Title = s.Title, 
                IsCompleted = s.IsCompleted,
                TaskCardId = s.TaskCardId
            }).OrderBy(s => s.Id).ToList()
        };
    }
}
