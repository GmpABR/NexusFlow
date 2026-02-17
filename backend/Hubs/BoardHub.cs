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

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
