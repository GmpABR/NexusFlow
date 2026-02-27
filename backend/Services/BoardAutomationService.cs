using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Services;

public class BoardAutomationService : IAutomationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<Backend.Hubs.BoardHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    
    public BoardAutomationService(AppDbContext db, IHubContext<Backend.Hubs.BoardHub> hubContext, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
    }

    public async Task<List<AutomationDto>> GetAutomationsAsync(int boardId)
    {
        return await _db.BoardAutomations
            .AsNoTracking()
            .Where(a => a.BoardId == boardId)
            .Select(a => new AutomationDto
            {
                Id = a.Id,
                BoardId = a.BoardId,
                TriggerType = a.TriggerType,
                TriggerCondition = a.TriggerCondition,
                ActionType = a.ActionType,
                ActionValue = a.ActionValue,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<AutomationDto> CreateAutomationAsync(int boardId, CreateAutomationDto dto)
    {
        var automation = new BoardAutomation
        {
            BoardId = boardId,
            TriggerType = dto.TriggerType,
            TriggerCondition = dto.TriggerCondition,
            ActionType = dto.ActionType,
            ActionValue = dto.ActionValue,
            CreatedAt = DateTime.UtcNow
        };

        _db.BoardAutomations.Add(automation);
        await _db.SaveChangesAsync();

        return new AutomationDto
        {
            Id = automation.Id,
            BoardId = automation.BoardId,
            TriggerType = automation.TriggerType,
            TriggerCondition = automation.TriggerCondition,
            ActionType = automation.ActionType,
            ActionValue = automation.ActionValue,
            CreatedAt = automation.CreatedAt
        };
    }

    public async Task<bool> DeleteAutomationAsync(int automationId)
    {
        var automation = await _db.BoardAutomations.FindAsync(automationId);
        if (automation == null) return false;

        _db.BoardAutomations.Remove(automation);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExecuteTaskMovedAutomationsAsync(int boardId, int taskId, int newColumnId, int userId)
    {
        // 1. Fetch matching automations for this board where a task moves to this specific column
        var automations = await _db.BoardAutomations
            .Where(a => a.BoardId == boardId 
                     && a.TriggerType == "TaskMovedToColumn" 
                     && a.TriggerCondition == newColumnId.ToString())
            .ToListAsync();

        if (!automations.Any()) return false;

        // 2. Fetch the task and include relations we might modify
        var task = await _db.TaskCards
            .Include(t => t.Subtasks)
            .Include(t => t.Assignees)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return false;

        bool taskModified = false;

        foreach (var rule in automations)
        {
            try
            {
                switch (rule.ActionType)
                {
                    case "CompleteSubtasks":
                        if (task.Subtasks != null && task.Subtasks.Any(s => !s.IsCompleted))
                        {
                            foreach (var sub in task.Subtasks)
                            {
                                sub.IsCompleted = true;
                            }
                            taskModified = true;
                            await LogActivity(taskId, userId, "Automation", "Automatically completed all subtasks based on a board rule.");
                        }
                        break;

                    case "AssignToUser":
                        if (int.TryParse(rule.ActionValue, out int targetUserId))
                        {
                            if (task.AssigneeId != targetUserId)
                            {
                                task.AssigneeId = targetUserId;
                                taskModified = true;
                            }
                            
                            if (task.Assignees != null && !task.Assignees.Any(a => a.UserId == targetUserId))
                            {
                                task.Assignees.Add(new TaskAssignee { TaskCardId = taskId, UserId = targetUserId });
                                taskModified = true;
                            }
                            
                            if (taskModified)
                            {
                                await LogActivity(taskId, userId, "Automation", $"Automatically assigned task to User ID {targetUserId} based on a board rule.");
                            }
                        }
                        break;

                    case "ClearAssignee":
                        if (task.AssigneeId != null || (task.Assignees != null && task.Assignees.Any()))
                        {
                            task.AssigneeId = null;
                            if (task.Assignees != null && task.Assignees.Any())
                            {
                                _db.TaskAssignees.RemoveRange(task.Assignees);
                            }
                            taskModified = true;
                            await LogActivity(taskId, userId, "Automation", "Automatically removed assigned user(s) based on a board rule.");
                        }
                        break;

                    case "SetPriority":
                        if (!string.IsNullOrWhiteSpace(rule.ActionValue) && task.Priority != rule.ActionValue)
                        {
                            task.Priority = rule.ActionValue;
                            taskModified = true;
                            await LogActivity(taskId, userId, "Automation", $"Automatically set priority to '{rule.ActionValue}' based on a board rule.");
                        }
                        break;

                    case "AddLabel":
                        if (int.TryParse(rule.ActionValue, out int labelId))
                        {
                            bool hasLabel = await _db.TaskLabels.AnyAsync(tl => tl.TaskCardId == taskId && tl.LabelId == labelId);
                            if (!hasLabel)
                            {
                                _db.TaskLabels.Add(new TaskLabel { TaskCardId = taskId, LabelId = labelId });
                                taskModified = true;
                                await LogActivity(taskId, userId, "Automation", "Automatically added a label to the task based on a board rule.");
                            }
                        }
                        break;

                    case "RemoveLabel":
                        if (int.TryParse(rule.ActionValue, out int removeLabelId))
                        {
                            var existingLabel = await _db.TaskLabels.FirstOrDefaultAsync(tl => tl.TaskCardId == taskId && tl.LabelId == removeLabelId);
                            if (existingLabel != null)
                            {
                                _db.TaskLabels.Remove(existingLabel);
                                taskModified = true;
                                await LogActivity(taskId, userId, "Automation", "Automatically removed a label from the task based on a board rule.");
                            }
                        }
                        break;

                    case "PostComment":
                        if (!string.IsNullOrWhiteSpace(rule.ActionValue))
                        {
                            await LogActivity(taskId, userId, "Commented", rule.ActionValue);
                            taskModified = true;
                        }
                        break;

                    case "SetDueDate":
                        if (int.TryParse(rule.ActionValue, out int daysFromNow))
                        {
                            var newDueDate = DateTime.UtcNow.AddDays(daysFromNow);
                            task.DueDate = DateTime.SpecifyKind(newDueDate, DateTimeKind.Utc);
                            taskModified = true;
                            await LogActivity(taskId, userId, "Automation", $"Automatically set due date to {daysFromNow} days from now based on a board rule.");
                        }
                        break;

                    case "AiSummary":
                        Console.WriteLine($"[Automation] Triggered AiSummary for Task {taskId} in Board {boardId}");
                        // AI Summary is slow, handle it in background to keep UI instant
                        _ = Task.Run(async () => {
                            try {
                                using var scope = _scopeFactory.CreateScope();
                                var scopedContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                var scopedHub = scope.ServiceProvider.GetRequiredService<IHubContext<Backend.Hubs.BoardHub>>();
                                var scopedTaskService = scope.ServiceProvider.GetRequiredService<ITaskService>();
                                var scopedNotifService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                                // Fetch fresh state in new scope
                                var bTask = await scopedContext.TaskCards
                                    .Include(t => t.Column)
                                    .Include(t => t.Assignee)
                                    .Include(t => t.Assignees).ThenInclude(ta => ta.User)
                                    .Include(t => t.Labels).ThenInclude(tl => tl.Label)
                                    .FirstOrDefaultAsync(t => t.Id == taskId);
                                if (bTask == null) {
                                    Console.WriteLine($"[Automation] Task {taskId} not found in scope.");
                                    return;
                                }

                                // Fetch comments
                                var comments = await scopedContext.TaskActivities
                                    .Where(a => a.TaskCardId == taskId && a.Action == "Commented")
                                    .OrderBy(a => a.Timestamp)
                                    .Select(a => a.Details)
                                    .ToListAsync();

                                string aiContext = $"Title: {bTask.Title}\nDescription: {bTask.Description}\nComments:\n{string.Join("\n", comments)}";
                                
                                // Fallback: if current user has no key, try the board owner
                                int targetKeyUserId = userId;
                                var triggeringUser = await scopedContext.Users.FindAsync(userId);
                                if (triggeringUser == null || string.IsNullOrEmpty(triggeringUser.OpenRouterApiKey))
                                {
                                    var owner = await scopedContext.BoardMembers
                                        .Where(bm => bm.BoardId == boardId && bm.Role == "Owner")
                                        .FirstOrDefaultAsync();
                                    if (owner != null) targetKeyUserId = owner.UserId;
                                }

                                Console.WriteLine($"[Automation] Generating AI Summary using key from User {targetKeyUserId}...");
                                var keyUser = await scopedContext.Users.FindAsync(targetKeyUserId);
                                if (keyUser == null || string.IsNullOrEmpty(keyUser.OpenRouterApiKey))
                                {
                                    Console.WriteLine($"[Automation] AI Summary failed: No API key found for User {userId} or Board Owner.");
                                    await scopedNotifService.CreateNotificationAsync(userId == 0 ? 1 : userId, 
                                        $"AI Summary failed for '{bTask.Title}': No OpenRouter API key configured for you or the board owner.", 
                                        "Error", taskId);
                                    return;
                                }

                                string summary = await GenerateAiSummaryInternal(aiContext, targetKeyUserId, scopedContext);
                                
                                if (!string.IsNullOrEmpty(summary))
                                {
                                    Console.WriteLine($"[Automation] Summary generated, length: {summary.Length}. Creating attachment...");
                                    
                                    // Build dynamic metadata section
                                    var metadataEntries = new List<string>();
                                    if (!string.IsNullOrEmpty(bTask.Priority)) metadataEntries.Add($"**Priority:** {bTask.Priority}");
                                    
                                    var assignees = bTask.Assignees?.Select(a => a.User?.FullName ?? a.User?.Username).Where(n => n != null).ToList();
                                    if (assignees != null && assignees.Any()) metadataEntries.Add($"**Assignees:** {string.Join(", ", assignees)}");
                                    else if (bTask.Assignee != null) metadataEntries.Add($"**Assignee:** {bTask.Assignee.FullName ?? bTask.Assignee.Username}");

                                    var tags = bTask.Labels?.Select(l => l.Label?.Name).Where(n => n != null).ToList();
                                    if (tags != null && tags.Any()) metadataEntries.Add($"**Tags:** {string.Join(", ", tags)}");

                                    string metadataSection = metadataEntries.Any() ? string.Join("\n", metadataEntries) + "\n" : "";

                                    // Professional header for the Markdown file
                                    string markdownContent = $"# AI Task Summary\n\n**Task:** {bTask.Title}\n**Date:** {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC\n{metadataSection}\n---\n\n{summary}\n\n---\n*Generated automatically by NexusFlow AI*";
                                    var base64Content = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(markdownContent));
                                    var dataUrl = $"data:text/markdown;base64,{base64Content}";

                                    var attDto = new CreateAttachmentDto {
                                        FileName = $"AI-Summary-{DateTime.UtcNow:yyyy-MM-dd-HHmm}.md",
                                        PublicUrl = dataUrl,
                                        StoragePath = "internal/ai-summary",
                                        ContentType = "text/markdown",
                                        FileSizeBytes = markdownContent.Length
                                    };

                                    await scopedTaskService.AddAttachmentAsync(taskId, attDto, userId == 0 ? 1 : userId);

                                    // Broadcast update to sync new attachment on frontend
                                    var updatedDto = await scopedTaskService.GetTaskByIdAsync(taskId);
                                    if (updatedDto != null) {
                                        await scopedHub.Clients.Group($"board_{bTask.Column.BoardId}").SendAsync("TaskUpdated", updatedDto);
                                        Console.WriteLine($"[Automation] AI Summary attachment created and broadcasted for Task {taskId}");
                                    }
                                }
                                else {
                                    Console.WriteLine($"[Automation] AI Summary generation returned empty for Task {taskId}. Check API key.");
                                    await scopedNotifService.CreateNotificationAsync(userId == 0 ? 1 : userId, 
                                        $"AI Summary failed for '{bTask.Title}': The AI returned an empty response. Your OpenRouter API key might be invalid. Please check your Profile Settings.", 
                                        "Error", taskId);
                                }
                            } catch (Exception ex) {
                                Console.WriteLine($"[Automation] Async AI Summary failed: {ex.Message}");
                            }
                        });
                        break;
                }
            }
            catch (Exception ex)
            {
                // In production, log error instead of throwing to prevent blocking other rules
                Console.WriteLine($"[Automation] Rule {rule.Id} failed: {ex.Message}");
            }
        }

        if (taskModified)
        {
            await _db.SaveChangesAsync();
        }

        return taskModified;
    }

    private async Task LogActivity(int taskId, int userId, string action, string details)
    {
        // System actions (userId == 0) are still logged but with a default user or handled separately
        var activity = new TaskActivity
        {
            TaskCardId = taskId,
            UserId = userId == 0 ? 1 : userId, // Fallback to user 1 if system, or find a better way
            Action = action,
            Details = details,
            Timestamp = DateTime.UtcNow
        };
        
        _db.TaskActivities.Add(activity);
        await _db.SaveChangesAsync();
    }

    private async Task<string> GenerateAiSummaryInternal(string context, int userId, AppDbContext db)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.OpenRouterApiKey)) return string.Empty;

        try 
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {user.OpenRouterApiKey}");
            client.DefaultRequestHeaders.Add("HTTP-Referer", "https://nexus-flow.app");
            client.DefaultRequestHeaders.Add("X-Title", "NexusFlow Automations");

            var payload = new
            {
                model = "google/gemini-2.0-flash-001",
                messages = new[]
                {
                    new { role = "system", content = "You are a helpful project manager assistant. Summarize the following task accomplishments based on the title, description, and comments. Be concise, bulleted, and professional. Post as a summary of what was completed." },
                    new { role = "user", content = context }
                },
                max_tokens = 500
            };

            var response = await client.PostAsJsonAsync("https://openrouter.ai/api/v1/chat/completions", payload);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<JsonElement>();
                var content = result.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                return content ?? string.Empty;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Automation] AI Summary failed: {ex.Message}");
        }

        return string.Empty;
    }
}
