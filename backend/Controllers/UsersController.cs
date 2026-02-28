using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using Backend.Services;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PresenceTracker _presenceTracker;
    private readonly IHubContext<BoardHub> _hubContext;

    public UsersController(AppDbContext context, PresenceTracker presenceTracker, IHubContext<BoardHub> hubContext)
    {
        _context = context;
        _presenceTracker = presenceTracker;
        _hubContext = hubContext;
    }

    // ── GET /api/users/search?query=... ──────────────────────────────────
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<UserSummaryDto>>> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(new List<UserSummaryDto>());

        var users = await _context.Users
            .Where(u => u.Username.Contains(query) || u.Email.Contains(query))
            .Take(10)
            .Select(u => new UserSummaryDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                AvatarUrl = u.AvatarUrl,
                DisplayOfflineAlways = u.DisplayOfflineAlways
            })
            .ToListAsync();

        return Ok(users);
    }

    // ── GET /api/users/me ────────────────────────────────────────────────
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            FullName = user.FullName,
            JobTitle = user.JobTitle,
            Department = user.Department,
            Organization = user.Organization,
            Location = user.Location,
            Bio = user.Bio,
            ThemePreference = user.ThemePreference,
            OpenRouterApiKey = user.OpenRouterApiKey,
            DisplayOfflineAlways = user.DisplayOfflineAlways,
            CreatedAt = user.CreatedAt
        });
    }

    // ── PUT /api/users/me ────────────────────────────────────────────────
    [HttpPut("me")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (dto.AvatarUrl != null)
            user.AvatarUrl = dto.AvatarUrl.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Username))
        {
            // Check uniqueness
            var taken = await _context.Users.AnyAsync(u => u.Username == dto.Username.Trim() && u.Id != userId);
            if (taken) return BadRequest(new { message = "Username already taken." });
            user.Username = dto.Username.Trim();
        }

        if (dto.FullName != null) user.FullName = dto.FullName.Trim();
        if (dto.JobTitle != null) user.JobTitle = dto.JobTitle.Trim();
        if (dto.Department != null) user.Department = dto.Department.Trim();
        if (dto.Organization != null) user.Organization = dto.Organization.Trim();
        if (dto.Location != null) user.Location = dto.Location.Trim();
        if (dto.Bio != null) user.Bio = dto.Bio.Trim();
        if (dto.ThemePreference != null) user.ThemePreference = dto.ThemePreference.Trim();
        if (dto.OpenRouterApiKey != null) user.OpenRouterApiKey = dto.OpenRouterApiKey.Trim();

        bool presenceChanged = false;
        if (dto.DisplayOfflineAlways.HasValue && user.DisplayOfflineAlways != dto.DisplayOfflineAlways.Value)
        {
            user.DisplayOfflineAlways = dto.DisplayOfflineAlways.Value;
            presenceChanged = true;
        }

        await _context.SaveChangesAsync();

        if (presenceChanged)
        {
            if (user.DisplayOfflineAlways)
            {
                await _hubContext.Clients.All.SendAsync("UserOffline", userId);
            }
            else
            {
                // Only broadcast as online if they actually have active SignalR connections
                if (_presenceTracker.GetOnlineUsers().Contains(userId))
                {
                    await _hubContext.Clients.All.SendAsync("UserOnline", userId);
                }
            }
        }

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            FullName = user.FullName,
            JobTitle = user.JobTitle,
            Department = user.Department,
            Organization = user.Organization,
            Location = user.Location,
            Bio = user.Bio,
            OpenRouterApiKey = user.OpenRouterApiKey,
            DisplayOfflineAlways = user.DisplayOfflineAlways,
            CreatedAt = user.CreatedAt
        });
    }

    // ── GET /api/users/presence ──────────────────────────────────────────
    [HttpGet("presence")]
    public async Task<ActionResult<IEnumerable<int>>> GetPresence()
    {
        var onlineUserIds = _presenceTracker.GetOnlineUsers().ToList();

        if (!onlineUserIds.Any())
            return Ok(new List<int>());

        // Filter out users who have DisplayOfflineAlways = true
        var visibleOnlineUserIds = await _context.Users
            .Where(u => onlineUserIds.Contains(u.Id) && !u.DisplayOfflineAlways)
            .Select(u => u.Id)
            .ToListAsync();

        return Ok(visibleOnlineUserIds);
    }

    // ── GET /api/users/me/tasks ──────────────────────────────────────────
    [HttpGet("me/tasks")]
    public async Task<ActionResult<IEnumerable<MyTaskDto>>> GetMyTasks()
    {
        var userId = GetUserId();

        var tasks = await _context.TaskCards
            .Where(t => t.AssigneeId == userId || t.Assignees.Any(a => a.UserId == userId))
            .Include(t => t.Column)
                .ThenInclude(c => c.Board)
            .OrderBy(t => t.DueDate)
            .Select(t => new MyTaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
                DueDate = t.DueDate,
                StoryPoints = t.StoryPoints,
                Tags = t.Tags,
                ColumnId = t.ColumnId,
                ColumnName = t.Column.Name,
                BoardId = t.Column.Board.Id,
                BoardName = t.Column.Board.Name
            })
            .ToListAsync();

        return Ok(tasks);
    }

    private int GetUserId()
    {
        var claims = User.Claims.Select(c => $"{c.Type}: {c.Value}");
        Console.WriteLine($"[UsersController] User Claims: {string.Join(", ", claims)}");

        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value
                      ?? User.FindFirst("id")?.Value
                      ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (int.TryParse(idClaim, out int userId))
        {
            Console.WriteLine($"[UsersController] Extracted UserId: {userId}");
            return userId;
        }

        Console.WriteLine("[UsersController] WARNING: UserId claim not found or not an integer.");
        return 0;
    }
}
