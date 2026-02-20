using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        var hasAccess = await _db.Boards
            .Where(b => b.Id == boardId)
            .AnyAsync(b => b.OwnerId == userId || b.Members.Any(m => m.UserId == userId));

        if (!hasAccess) return Forbid();

        // 2. Aggregate Task Data
        var tasks = await _db.TaskCards
            .AsNoTracking()
            .Where(t => t.Column.BoardId == boardId)
            .Include(t => t.TimeLogs)
            .ThenInclude(tl => tl.User)
            .ToListAsync();

        int totalTasks = tasks.Count;
        
        // Let's assume the right-most column means "Done", or any column named "Done" / "Completed"
        // Since we don't have a strict strict "Done" flag on the Task itself mapping to Agile,
        // Let's find columns containing 'Done' or 'Complete'
        var doneColumnIds = await _db.Columns
            .AsNoTracking()
            .Where(c => c.BoardId == boardId && (c.Name.ToLower().Contains("done") || c.Name.ToLower().Contains("complete")))
            .Select(c => c.Id)
            .ToListAsync();

        int completedTasks = tasks.Count(t => doneColumnIds.Contains(t.ColumnId));
        int pendingTasks = totalTasks - completedTasks;

        // 3. User Time Tracking Aggregation
        var userTimeData = new Dictionary<string, int>();
        foreach (var task in tasks)
        {
            foreach (var log in task.TimeLogs.Where(tl => tl.DurationMinutes.HasValue))
            {
                var username = log.User?.Username ?? "Unknown";
                if (!userTimeData.ContainsKey(username))
                {
                    userTimeData[username] = 0;
                }
                userTimeData[username] += log.DurationMinutes!.Value;
            }
        }

        // 4. Burn Down Chart Data (Tasks remaining over the last 7 days)
        var burnDownData = new Dictionary<string, int>();

        // Approximate completion date for currently done tasks as their latest activity timestamp
        // If they have no activity, we just use their CreatedAt date as a fallback.
        var doneTaskDates = await _db.TaskActivities
            .AsNoTracking()
            .Where(a => a.TaskCard.Column.BoardId == boardId && doneColumnIds.Contains(a.TaskCard.ColumnId))
            .GroupBy(a => a.TaskCardId)
            .Select(g => new { TaskId = g.Key, DoneDate = g.Max(a => a.Timestamp) })
            .ToDictionaryAsync(x => x.TaskId, x => x.DoneDate);

        for (int i = 6; i >= 0; i--)
        {
            var date = DateTime.UtcNow.Date.AddDays(-i);
            
            int pendingOnDate = 0;
            foreach (var task in tasks)
            {
                // Was it created by the end of 'date'?
                if (task.CreatedAt.Date <= date.Date)
                {
                    if (doneColumnIds.Contains(task.ColumnId))
                    {
                        // It's currently done. Was it done AFTER 'date'?
                        var doneDate = doneTaskDates.ContainsKey(task.Id) ? doneTaskDates[task.Id] : task.CreatedAt;
                        if (doneDate.Date > date.Date)
                        {
                            pendingOnDate++; // It was still pending on this date
                        }
                    }
                    else
                    {
                        // It's not done yet, so it was pending on 'date'
                        pendingOnDate++;
                    }
                }
            }
            
            burnDownData[date.ToString("MMM dd")] = pendingOnDate;
        }

        var dto = new BoardAnalyticsDto
        {
            BoardId = boardId,
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            PendingTasks = pendingTasks,
            UserTimeData = userTimeData,
            BurnDownData = burnDownData
        };

        return Ok(dto);
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
