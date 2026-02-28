using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;

    public TaskService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
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
            Tags = dto.Tags,
            ErDiagramPuml = dto.ErDiagramPuml
        };

        _db.TaskCards.Add(task);
        await _db.SaveChangesAsync();

        // Sync multi-assignees
        if (dto.AssigneeIds != null && dto.AssigneeIds.Count > 0)
        {
            foreach (var uid in dto.AssigneeIds.Distinct())
            {
                _db.TaskAssignees.Add(new TaskAssignee { TaskCardId = task.Id, UserId = uid });
            }
            await _db.SaveChangesAsync();
        }

        // Sync labels
        if (dto.LabelIds != null && dto.LabelIds.Count > 0)
        {
            foreach (var lid in dto.LabelIds.Distinct())
            {
                _db.TaskLabels.Add(new TaskLabel { TaskCardId = task.Id, LabelId = lid });
            }
            await _db.SaveChangesAsync();
        }

        await LogActivity(task.Id, userId, "Created", $"Task created in column {task.ColumnId}");

        if (task.AssigneeId.HasValue && task.AssigneeId != userId)
        {
            await _notificationService.CreateNotificationAsync(task.AssigneeId.Value, $"Você foi atribuído à tarefa: {task.Title}", "Assignment", task.Id);
        }

        return await MapToDto(task);
    }

    public async Task<TaskCardDto?> UpdateTaskAsync(int taskId, UpdateTaskDto dto, int userId)
    {
        var task = await _db.TaskCards
            .Include(t => t.Assignee)
            .Include(t => t.Assignees).ThenInclude(a => a.User)
            .Include(t => t.Subtasks)
            .Include(t => t.Attachments).ThenInclude(a => a.UploadedBy)
            .Include(t => t.TimeLogs)
            .Include(t => t.Column)
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
        task.ErDiagramPuml = dto.ErDiagramPuml;

        await _db.SaveChangesAsync();

        // Sync multi-assignees (full replace)
        if (dto.AssigneeIds != null)
        {
            var existing = await _db.TaskAssignees.Where(ta => ta.TaskCardId == taskId).ToListAsync();
            _db.TaskAssignees.RemoveRange(existing);
            foreach (var uid in dto.AssigneeIds.Distinct())
            {
                _db.TaskAssignees.Add(new TaskAssignee { TaskCardId = taskId, UserId = uid });
            }
            await _db.SaveChangesAsync();
        }

        // Sync labels (full replace)
        if (dto.LabelIds != null)
        {
            var existing = await _db.TaskLabels.Where(tl => tl.TaskCardId == taskId).ToListAsync();
            _db.TaskLabels.RemoveRange(existing);
            foreach (var lid in dto.LabelIds.Distinct())
            {
                _db.TaskLabels.Add(new TaskLabel { TaskCardId = taskId, LabelId = lid });
            }
            await _db.SaveChangesAsync();
        }
        
        if (changes.Any())
        {
             await LogActivity(taskId, userId, "Updated", string.Join(", ", changes));
        }

        // Notify new assignee if changed
        if (dto.AssigneeId.HasValue && dto.AssigneeId != userId && dto.AssigneeId != task.AssigneeId)
        {
             await _notificationService.CreateNotificationAsync(dto.AssigneeId.Value, $"Você foi atribuído à tarefa: {task.Title}", "Assignment", taskId);
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
        var task = await _db.TaskCards
            .Include(t => t.Column)
            .Include(t => t.Assignee)
            .Include(t => t.Assignees).ThenInclude(a => a.User)
            .Include(t => t.Subtasks)
            .Include(t => t.Attachments).ThenInclude(a => a.UploadedBy)
            .Include(t => t.TimeLogs)
            .FirstOrDefaultAsync(t => t.Id == taskId);
            
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

    public async Task<Subtask?> GetSubtaskByIdAsync(int subtaskId)
    {
        return await _db.Subtasks.FindAsync(subtaskId);
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
            .AsSplitQuery()
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
                ErDiagramPuml = t.ErDiagramPuml,
                TotalTimeSpentMinutes = t.TimeLogs.Where(tl => tl.DurationMinutes.HasValue).Sum(tl => tl.DurationMinutes!.Value),
                IsTimerRunning = t.TimeLogs.Any(tl => tl.StoppedAt == null),
                Assignees = t.Assignees.Select(ta => new AssigneeDto { UserId = ta.UserId, Username = ta.User.Username }).ToList(),
                Attachments = t.Attachments.OrderByDescending(a => a.UploadedAt).Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    TaskCardId = a.TaskCardId,
                    UploadedById = a.UploadedById,
                    UploadedByUsername = a.UploadedBy.Username,
                    FileName = a.FileName,
                    StoragePath = a.StoragePath,
                    PublicUrl = a.PublicUrl,
                    ContentType = a.ContentType,
                    FileSizeBytes = a.FileSizeBytes,
                    UploadedAt = a.UploadedAt
                }).ToList(),
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
    
    public async Task<List<TaskActivityDto>> GetTaskActivitiesAsync(int taskId)
    {
        // 1. Fetch activities without Joins
        var activitiesData = await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCardId == taskId)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new 
            {
                a.Id,
                a.TaskCardId,
                a.UserId,
                a.Action,
                a.Details,
                a.Timestamp
            })
            .ToListAsync();

        var activityIds = activitiesData.Select(a => a.Id).ToList();
        var userIds = activitiesData.Select(a => a.UserId).ToHashSet();

        // 2. Fetch reactions without Joins
        var reactionsData = await _db.TaskActivityReactions
            .AsNoTracking()
            .Where(r => activityIds.Contains(r.TaskActivityId))
            .Select(r => new 
            {
                r.Id,
                r.TaskActivityId,
                r.Emoji,
                r.UserId
            })
            .ToListAsync();

        foreach (var r in reactionsData)
        {
            userIds.Add(r.UserId);
        }

        var reactionsByActivity = reactionsData
            .GroupBy(r => r.TaskActivityId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // 3. Fetch referenced Users dictionary
        var users = await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.Username, u.AvatarUrl });

        // 4. Map to DTO in memory 
        var dtos = activitiesData.Select(a => 
        {
            users.TryGetValue(a.UserId, out var actUser);
            return new TaskActivityDto
            {
                Id = a.Id,
                TaskCardId = a.TaskCardId,
                UserId = a.UserId,
                Username = actUser?.Username ?? "Unknown",
                UserAvatarUrl = actUser?.AvatarUrl,
                Action = a.Action,
                Details = a.Details,
                Timestamp = a.Timestamp,
                Reactions = reactionsByActivity.TryGetValue(a.Id, out var rels) 
                    ? rels.Select(r => 
                    {
                        users.TryGetValue(r.UserId, out var reacUser);
                        return new ActivityReactionDto
                        {
                            Id = r.Id,
                            Emoji = r.Emoji,
                            UserId = r.UserId,
                            Username = reacUser?.Username ?? "Unknown"
                        };
                    }).ToList() 
                    : new List<ActivityReactionDto>()
            };
        }).ToList();

        return dtos;
    }

    public async Task<TaskActivityDto> AddCommentAsync(int taskId, string text, int userId)
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

        Console.WriteLine($"[TaskService] Comment saved. ActivityId: {activity.Id}, TaskId: {taskId}, UserId: {userId}");

        // Detect mentions @username
        await DetectMentionsAsync(taskId, text, userId);

        // Load user info for the DTO
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) 
        {
            Console.WriteLine($"[TaskService] WARNING: User not found in database for userId: {userId}");
        }
        else 
        {
            Console.WriteLine($"[TaskService] User found: {user.Username} (ID: {user.Id})");
        }

        return new TaskActivityDto
        {
            Id = activity.Id,
            TaskCardId = activity.TaskCardId,
            UserId = activity.UserId,
            Username = user?.Username ?? "Unknown",
            UserAvatarUrl = user?.AvatarUrl,
            Action = activity.Action,
            Details = activity.Details,
            Timestamp = activity.Timestamp,
            Reactions = new List<ActivityReactionDto>()
        };
    }

    public async Task<TaskActivityDto?> UpdateActivityAsync(int activityId, string text, int userId)
    {
        var activity = await _db.TaskActivities
            .Include(a => a.User)
            .Include(a => a.Reactions)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(a => a.Id == activityId);

        if (activity == null || activity.Action != "Commented") return null;
        if (activity.UserId != userId) return null; // Only author can edit

        activity.Details = text;
        // Optional: track if edited? For now, just update.
        await _db.SaveChangesAsync();

        return new TaskActivityDto
        {
            Id = activity.Id,
            TaskCardId = activity.TaskCardId,
            UserId = activity.UserId,
            Username = activity.User?.Username ?? "Unknown",
            UserAvatarUrl = activity.User?.AvatarUrl,
            Action = activity.Action,
            Details = activity.Details,
            Timestamp = activity.Timestamp,
            Reactions = activity.Reactions.Select(r => new ActivityReactionDto
            {
                Id = r.Id,
                Emoji = r.Emoji,
                UserId = r.UserId,
                Username = r.User?.Username ?? "Unknown"
            }).ToList()
        };
    }

    public async Task<bool> DeleteActivityAsync(int activityId, int userId)
    {
        var activity = await _db.TaskActivities
            .Include(a => a.TaskCard)
                .ThenInclude(t => t.Column)
            .FirstOrDefaultAsync(a => a.Id == activityId);

        if (activity == null) return false;

        // Check permission: Author or Board Owner/Admin
        if (activity.UserId == userId)
        {
            _db.TaskActivities.Remove(activity);
            await _db.SaveChangesAsync();
            return true;
        }

        var boardMember = await _db.BoardMembers
            .FirstOrDefaultAsync(bm => bm.BoardId == activity.TaskCard.Column.BoardId && bm.UserId == userId);

        if (boardMember != null && (boardMember.Role == "Owner" || boardMember.Role == "Admin"))
        {
            _db.TaskActivities.Remove(activity);
            await _db.SaveChangesAsync();
            return true;
        }

        return false;
    }

    public async Task<TaskActivityReactionDto?> ToggleReactionAsync(int activityId, string emoji, int userId)
    {
        var activity = await _db.TaskActivities.FindAsync(activityId);
        if (activity == null) return null;

        var existing = await _db.TaskActivityReactions
            .FirstOrDefaultAsync(r => r.TaskActivityId == activityId && r.UserId == userId && r.Emoji == emoji);

        if (existing != null)
        {
            _db.TaskActivityReactions.Remove(existing);
            await _db.SaveChangesAsync();
            return null; // Removed
        }
        else
        {
            var reaction = new TaskActivityReaction
            {
                TaskActivityId = activityId,
                UserId = userId,
                Emoji = emoji
            };
            _db.TaskActivityReactions.Add(reaction);
            await _db.SaveChangesAsync();

            await _db.Entry(reaction).Reference(r => r.User).LoadAsync();
            return new TaskActivityReactionDto
            {
                Id = reaction.Id,
                TaskActivityId = reaction.TaskActivityId,
                UserId = reaction.UserId,
                Username = reaction.User.Username,
                Emoji = reaction.Emoji
            };
        }
    }

    private async Task DetectMentionsAsync(int taskId, string text, int senderId)
    {
        var matches = System.Text.RegularExpressions.Regex.Matches(text, @"@(\w+)");
        var task = await _db.TaskCards.FindAsync(taskId);
        var sender = await _db.Users.FindAsync(senderId);

        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            var username = match.Groups[1].Value;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
            
            if (user != null && user.Id != senderId)
            {
                await _notificationService.CreateNotificationAsync(user.Id, $"{sender?.Username} mencionou você na tarefa: {task?.Title}", "Mention", taskId);
            }
        }
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
        if (task.Assignee == null && task.AssigneeId.HasValue) 
        {
             await _db.Entry(task).Reference(t => t.Assignee).LoadAsync();
        }
        if (task.Column == null)
        {
            await _db.Entry(task).Reference(t => t.Column).LoadAsync();
        }
        if (!_db.Entry(task).Collection(t => t.Subtasks).IsLoaded) 
        {
            await _db.Entry(task).Collection(t => t.Subtasks).LoadAsync();
        }
        if (!_db.Entry(task).Collection(t => t.TimeLogs).IsLoaded)
        {
            await _db.Entry(task).Collection(t => t.TimeLogs).LoadAsync();
        }
        if (!_db.Entry(task).Collection(t => t.Labels).IsLoaded)
        {
            await _db.Entry(task).Collection(t => t.Labels).LoadAsync();
        }

        // Load Assignees with User
        var assignees = await _db.TaskAssignees
            .Where(ta => ta.TaskCardId == task.Id)
            .Include(ta => ta.User)
            .ToListAsync();

        // Load Attachments with UploadedBy
        var attachments = await _db.Attachments
            .Where(a => a.TaskCardId == task.Id)
            .Include(a => a.UploadedBy)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();

        // Load Labels with Label entity
        var taskLabels = await _db.TaskLabels
            .Where(tl => tl.TaskCardId == task.Id)
            .Include(tl => tl.Label)
            .ToListAsync();

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
            AssigneeAvatar = null,
            Tags = task.Tags,
            ErDiagramPuml = task.ErDiagramPuml,
            TotalTimeSpentMinutes = (task.TimeLogs ?? new List<TimeLog>()).Where(tl => tl.DurationMinutes.HasValue).Sum(tl => tl.DurationMinutes!.Value),
            IsTimerRunning = (task.TimeLogs ?? new List<TimeLog>()).Any(tl => tl.StoppedAt == null),
            Assignees = assignees.Select(ta => new AssigneeDto { UserId = ta.UserId, Username = ta.User.Username }).ToList(),
            Attachments = attachments.Select(a => new AttachmentDto
            {
                Id = a.Id,
                TaskCardId = a.TaskCardId,
                UploadedById = a.UploadedById,
                UploadedByUsername = a.UploadedBy?.Username ?? "",
                FileName = a.FileName,
                StoragePath = a.StoragePath,
                PublicUrl = a.PublicUrl,
                ContentType = a.ContentType,
                FileSizeBytes = a.FileSizeBytes,
                UploadedAt = a.UploadedAt
            }).ToList(),
            Subtasks = (task.Subtasks ?? new List<Subtask>()).Select(s => new SubtaskDto 
            { 
                Id = s.Id, 
                Title = s.Title, 
                IsCompleted = s.IsCompleted,
                TaskCardId = s.TaskCardId
            }).OrderBy(s => s.Id).ToList(),
            Labels = taskLabels.Select(tl => new LabelDto
            {
                Id = tl.Label.Id,
                Name = tl.Label.Name,
                Color = tl.Label.Color,
                BoardId = tl.Label.BoardId
            }).ToList()
        };
    }

    // Label Methods Implementation
    public async Task<bool> AddLabelToTaskAsync(int taskId, int labelId, int userId)
    {
        var existing = await _db.TaskLabels.AnyAsync(tl => tl.TaskCardId == taskId && tl.LabelId == labelId);
        if (existing) return true;

        _db.TaskLabels.Add(new TaskLabel { TaskCardId = taskId, LabelId = labelId });
        await _db.SaveChangesAsync();

        var label = await _db.Labels.FindAsync(labelId);
        await LogActivity(taskId, userId, "Label Added", $"Added label: {label?.Name ?? "Unknown"}");

        return true;
    }

    public async Task<bool> RemoveLabelFromTaskAsync(int taskId, int labelId, int userId)
    {
        var taskLabel = await _db.TaskLabels.FindAsync(taskId, labelId);
        if (taskLabel == null) return false;

        _db.TaskLabels.Remove(taskLabel);
        await _db.SaveChangesAsync();

        var label = await _db.Labels.FindAsync(labelId);
        await LogActivity(taskId, userId, "Label Removed", $"Removed label: {label?.Name ?? "Unknown"}");

        return true;
    }

    public async Task<bool> SetTaskLabelsAsync(int taskId, List<int> labelIds, int userId)
    {
        var existing = await _db.TaskLabels.Where(tl => tl.TaskCardId == taskId).ToListAsync();
        _db.TaskLabels.RemoveRange(existing);

        foreach (var lid in labelIds.Distinct())
        {
            _db.TaskLabels.Add(new TaskLabel { TaskCardId = taskId, LabelId = lid });
        }

        await _db.SaveChangesAsync();
        await LogActivity(taskId, userId, "Labels Updated", "Updated task labels");

        return true;
    }

    // Attachment Methods
    public async Task<List<AttachmentDto>> GetAttachmentsAsync(int taskId)
    {
        return await _db.Attachments
            .AsNoTracking()
            .Where(a => a.TaskCardId == taskId)
            .Include(a => a.UploadedBy)
            .OrderByDescending(a => a.UploadedAt)
            .Select(a => new AttachmentDto
            {
                Id = a.Id,
                TaskCardId = a.TaskCardId,
                UploadedById = a.UploadedById,
                UploadedByUsername = a.UploadedBy.Username,
                FileName = a.FileName,
                StoragePath = a.StoragePath,
                PublicUrl = a.PublicUrl,
                ContentType = a.ContentType,
                FileSizeBytes = a.FileSizeBytes,
                UploadedAt = a.UploadedAt
            })
            .ToListAsync();
    }

    public async Task<AttachmentDto> AddAttachmentAsync(int taskId, CreateAttachmentDto dto, int userId)
    {
        var attachment = new Attachment
        {
            TaskCardId = taskId,
            UploadedById = userId,
            FileName = dto.FileName,
            StoragePath = dto.StoragePath,
            PublicUrl = dto.PublicUrl,
            ContentType = dto.ContentType,
            FileSizeBytes = dto.FileSizeBytes,
            UploadedAt = DateTime.UtcNow
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync();

        await _db.Entry(attachment).Reference(a => a.UploadedBy).LoadAsync();
        await LogActivity(taskId, userId, "Attachment Added", $"Attached file: {dto.FileName}");

        return new AttachmentDto
        {
            Id = attachment.Id,
            TaskCardId = attachment.TaskCardId,
            UploadedById = attachment.UploadedById,
            UploadedByUsername = attachment.UploadedBy?.Username ?? "",
            FileName = attachment.FileName,
            StoragePath = attachment.StoragePath,
            PublicUrl = attachment.PublicUrl,
            ContentType = attachment.ContentType,
            FileSizeBytes = attachment.FileSizeBytes,
            UploadedAt = attachment.UploadedAt
        };
    }

    public async Task<bool> DeleteAttachmentAsync(int attachmentId, int userId)
    {
        var attachment = await _db.Attachments.FindAsync(attachmentId);
        if (attachment == null) return false;

        int taskId = attachment.TaskCardId;
        string fileName = attachment.FileName;

        _db.Attachments.Remove(attachment);
        await _db.SaveChangesAsync();

        await LogActivity(taskId, userId, "Attachment Deleted", $"Removed file: {fileName}");
        return true;
    }

    public async Task<TaskActivityDto?> GetActivityByIdAsync(int activityId)
    {
        var activity = await _db.TaskActivities
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Reactions)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(a => a.Id == activityId);

        if (activity == null) return null;

        return new TaskActivityDto
        {
            Id = activity.Id,
            TaskCardId = activity.TaskCardId,
            UserId = activity.UserId,
            Username = activity.User?.Username ?? "Unknown",
            UserAvatarUrl = activity.User?.AvatarUrl,
            Action = activity.Action,
            Details = activity.Details,
            Timestamp = activity.Timestamp,
            Reactions = activity.Reactions.Select(r => new ActivityReactionDto
            {
                Id = r.Id,
                Emoji = r.Emoji,
                UserId = r.UserId,
                Username = r.User?.Username ?? "Unknown"
            }).ToList()
        };
    }
}
