using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface INotificationService
{
    Task<List<NotificationDto>> GetUserNotificationsAsync(int userId);
    Task<NotificationDto> CreateNotificationAsync(int userId, string message, string type, int? relatedId = null);
    Task<bool> MarkAsReadAsync(int notificationId, int userId);
    Task<bool> MarkAllAsReadAsync(int userId);
}
