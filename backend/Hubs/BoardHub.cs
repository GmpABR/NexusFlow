using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

[Authorize]
public class BoardHub : Hub
{
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
        if (!string.IsNullOrEmpty(userIdStr))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userIdStr}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdStr))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userIdStr}");
        }
        await base.OnDisconnectedAsync(exception);
    }
}
