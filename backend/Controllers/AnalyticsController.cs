using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("board/{boardId}")]
    public async Task<IActionResult> GetBoardAnalytics(int boardId)
    {
        // 1. Verify User has access to the board
        var userId = GetUserId();
        var board = await _db.Boards.FindAsync(boardId);
        if (board == null) return NotFound();

        var hasAccess = board.OwnerId == userId || 
                        await _db.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.UserId == userId && m.Status == "Accepted") ||
                        await _db.WorkspaceMembers.AnyAsync(wm => wm.WorkspaceId == board.WorkspaceId && wm.UserId == userId && wm.Status == "Accepted");

        if (!hasAccess) return Forbid();

        // 2. Aggregate Task Data with basic projections
        var taskData = await _db.TaskCards
            .AsNoTracking()
            .Where(t => t.Column.BoardId == boardId)
            .Select(t => new {
                t.Id,
                t.ColumnId,
                t.CreatedAt,
                TimeLogs = t.TimeLogs.Select(tl => new { tl.DurationMinutes, Username = tl.User.Username })
            })
            .ToListAsync();

        int totalTasks = taskData.Count;
        
        // Let's assume the right-most column means "Done", or any column named "Done" / "Completed"
        // Since we don't have a strict strict "Done" flag on the Task itself mapping to Agile,
        // Let's find columns containing 'Done' or 'Complete'
        var doneColumnIds = await _db.Columns
            .AsNoTracking()
            .Where(c => c.BoardId == boardId && (c.Name.ToLower().Contains("done") || c.Name.ToLower().Contains("complete")))
            .Select(c => c.Id)
            .ToListAsync();

        int completedTasks = taskData.Count(t => doneColumnIds.Contains(t.ColumnId));
        int pendingTasks = totalTasks - completedTasks;

        // 3. User Time Tracking Aggregation
        var userTimeData = taskData
            .SelectMany(t => t.TimeLogs)
            .Where(tl => tl.DurationMinutes.HasValue)
            .GroupBy(tl => tl.Username ?? "Unknown")
            .ToDictionary(g => g.Key, g => g.Sum(tl => tl.DurationMinutes!.Value));

        // 4. Burn Down Chart Data (Tasks remaining over the last 7 days)
        var burnDownData = new Dictionary<string, int>();
        var now = DateTime.UtcNow.Date;

        // Approximate completion date for currently done tasks as their latest activity timestamp
        var doneTaskDates = await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCard.Column.BoardId == boardId && doneColumnIds.Contains(a.TaskCard.ColumnId))
            .GroupBy(a => a.TaskCardId)
            .Select(g => new { TaskId = g.Key, DoneDate = g.Max(a => a.Timestamp) })
            .ToDictionaryAsync(x => x.TaskId, x => x.DoneDate);

        for (int i = 6; i >= 0; i--)
        {
            var date = now.AddDays(-i);
            
            int pendingOnDate = 0;
            foreach (var task in taskData)
            {
                if (task.CreatedAt.Date <= date)
                {
                    if (doneColumnIds.Contains(task.ColumnId))
                    {
                        var doneDate = doneTaskDates.ContainsKey(task.Id) ? doneTaskDates[task.Id] : task.CreatedAt;
                        if (doneDate.Date > date) pendingOnDate++;
                    }
                    else
                    {
                        pendingOnDate++;
                    }
                }
            }
            burnDownData[date.ToString("MMM dd")] = pendingOnDate;
        }

        // 5. Lead & Cycle Time Calculations
        // Optimized: Fetch only necessary activities
        var boardActivities = await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCard.Column.BoardId == boardId && (a.Action == "Moved" || a.Action == "Created"))
            .Select(a => new { a.TaskCardId, a.Action, a.Timestamp, a.Details })
            .ToListAsync();

        var activityByTask = boardActivities
            .GroupBy(a => a.TaskCardId)
            .ToDictionary(g => g.Key, g => g.OrderBy(a => a.Timestamp).ToList());

        var firstColumn = await _db.Columns
            .Where(c => c.BoardId == boardId)
            .OrderBy(c => c.Order)
            .Select(c => new { c.Id, c.Name })
            .FirstOrDefaultAsync();

        var leadTimes = new List<double>();
        var cycleTimes = new List<double>();

        foreach (var task in taskData)
        {
            if (doneColumnIds.Contains(task.ColumnId))
            {
                var doneDate = doneTaskDates.ContainsKey(task.Id) ? doneTaskDates[task.Id] : task.CreatedAt;
                leadTimes.Add(Math.Max(0, (doneDate - task.CreatedAt).TotalDays));

                DateTime workStartedDate = task.CreatedAt;
                if (activityByTask.ContainsKey(task.Id))
                {
                    var firstMove = activityByTask[task.Id]
                        .FirstOrDefault(a => a.Action == "Moved" && !a.Details.Contains($"to {firstColumn?.Name}"));
                    if (firstMove != null) workStartedDate = firstMove.Timestamp;
                }
                cycleTimes.Add(Math.Max(0, (doneDate - workStartedDate).TotalDays));
            }
        }

        var dto = new BoardAnalyticsDto
        {
            BoardId = boardId,
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            PendingTasks = pendingTasks,
            UserTimeData = userTimeData,
            BurnDownData = burnDownData,
            AverageLeadTimeDays = leadTimes.Any() ? Math.Round(leadTimes.Average(), 1) : 0,
            AverageCycleTimeDays = cycleTimes.Any() ? Math.Round(cycleTimes.Average(), 1) : 0
        };

        return Ok(dto);
    }

    [HttpGet("workspace/{workspaceId}")]
    public async Task<IActionResult> GetWorkspaceAnalytics(int workspaceId)
    {
        var userId = GetUserId();

        // Verify user is a member of this workspace
        var hasAccess = await _db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == workspaceId)
            .AnyAsync(w => w.OwnerId == userId || w.Members.Any(m => m.UserId == userId && m.Status == "Accepted"));

        if (!hasAccess) return Forbid();

        var now = DateTime.UtcNow;

        // 1. Efficient Counts (Execute directly in DB)
        var boardCount = await _db.Boards.CountAsync(b => b.WorkspaceId == workspaceId);
        var memberCount = await _db.WorkspaceMembers.CountAsync(m => m.WorkspaceId == workspaceId && m.Status == "Accepted");

        var workspaceTasksQuery = _db.TaskCards
            .AsNoTracking()
            .Where(t => t.Column.Board.WorkspaceId == workspaceId);

        int totalTasks = await workspaceTasksQuery.CountAsync();

        // Find IDs of columns that count as "Done"
        var doneColumnIds = await _db.Columns
            .AsNoTracking()
            .Where(c => c.Board.WorkspaceId == workspaceId &&
                        (c.Name.ToLower().Contains("done") || c.Name.ToLower().Contains("complete")))
            .Select(c => c.Id)
            .ToListAsync();

        int completedTasks = await workspaceTasksQuery.CountAsync(t => doneColumnIds.Contains(t.ColumnId));
        int pendingTasks = totalTasks - completedTasks;
        
        int overdueTasks = await workspaceTasksQuery.CountAsync(t =>
            !doneColumnIds.Contains(t.ColumnId) &&
            t.DueDate.HasValue &&
            t.DueDate.Value < now);

        // 2. Efficient Groupings (Execute in DB)
        var tasksByPriority = await workspaceTasksQuery
            .GroupBy(t => t.Priority)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var tasksByAssignee = await workspaceTasksQuery
            .Where(t => t.AssigneeId != null)
            .GroupBy(t => t.Assignee!.Username)
            .OrderByDescending(g => g.Count())
            .Take(8)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var tasksPerBoard = await workspaceTasksQuery
            .GroupBy(t => t.Column.Board.Name)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        // 3. Recent activity (stays mostly the same, already efficient)
        var recentActivity = await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCard.Column.Board.WorkspaceId == workspaceId &&
                        a.Timestamp >= now.AddDays(-7))
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .Select(a => new WorkspaceActivityDto
            {
                Username = a.User.Username,
                AvatarUrl = a.User.AvatarUrl,
                Action = a.Action,
                Details = a.Details ?? "",
                TaskTitle = a.TaskCard.Title,
                BoardName = a.TaskCard.Column.Board.Name,
                Timestamp = a.Timestamp
            })
            .ToListAsync();

        return Ok(new WorkspaceAnalyticsDto
        {
            WorkspaceId = workspaceId,
            TotalBoards = boardCount,
            TotalMembers = memberCount,
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            PendingTasks = pendingTasks,
            OverdueTasks = overdueTasks,
            TasksByPriority = tasksByPriority,
            TasksByAssignee = tasksByAssignee,
            TasksPerBoard = tasksPerBoard,
            RecentActivity = recentActivity,
            AverageLeadTimeDays = 0,
            AverageCycleTimeDays = 0
        });
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
