using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly PresenceTracker _presenceTracker;
    private readonly AppDbContext _context;

    public BoardHub(PresenceTracker presenceTracker, AppDbContext context)
    {
        _presenceTracker = presenceTracker;
        _context = context;
    }

    public async Task JoinBoard(string boardId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"board_{boardId}");
        await Clients.Group($"board_{boardId}")
            .SendAsync("UserJoined", Context.User?.Identity?.Name ?? "Unknown");
    }

    public async Task LeaveBoard(string boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board_{boardId}");
        await Clients.Group($"board_{boardId}")
            .SendAsync("UserLeft", Context.User?.Identity?.Name ?? "Unknown");
    }

    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out int userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userIdStr}");

            var isFirstConnection = _presenceTracker.UserConnected(userId, Context.ConnectionId);
            if (isFirstConnection)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null && !user.DisplayOfflineAlways)
                {
                    await Clients.All.SendAsync("UserOnline", userId);
                }
            }
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out int userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userIdStr}");

            var isOffline = _presenceTracker.UserDisconnected(userId, Context.ConnectionId);
            if (isOffline)
            {
                await Clients.All.SendAsync("UserOffline", userId);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }
}
