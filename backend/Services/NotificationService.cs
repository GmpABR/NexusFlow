using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<BoardHub> _hubContext;

    public NotificationService(AppDbContext db, IHubContext<BoardHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(int userId)
    {
        return await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Message = n.Message,
                Type = n.Type,
                RelatedId = n.RelatedId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<NotificationDto> CreateNotificationAsync(int userId, string message, string type, int? relatedId = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            Type = type,
            RelatedId = relatedId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        var dto = new NotificationDto
        {
            Id = notification.Id,
            Message = notification.Message,
            Type = notification.Type,
            RelatedId = notification.RelatedId,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };

        // Send real-time notification via SignalR
        // We use a group per user: "user_{userId}"
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", dto);

        return dto;
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null) return false;

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(int userId)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
        }

        await _db.SaveChangesAsync();
        return true;
    }
}
