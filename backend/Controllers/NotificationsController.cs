using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var notifications = await _notificationService.GetUserNotificationsAsync(GetUserId());
        return Ok(notifications);
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var result = await _notificationService.MarkAsReadAsync(id, GetUserId());
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await _notificationService.MarkAllAsReadAsync(GetUserId());
        return NoContent();
    }

    private int GetUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                      ?? User.FindFirst("sub")?.Value 
                      ?? User.FindFirst("id")?.Value;
                      
        if (int.TryParse(idClaim, out int userId))
        {
            return userId;
        }
        return 0;
    }
}
