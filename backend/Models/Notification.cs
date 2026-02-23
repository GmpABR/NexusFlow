namespace Backend.Models;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "System"; // Assignment, Mention, System
    public int? RelatedId { get; set; } // e.g., TaskId
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
