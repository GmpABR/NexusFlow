using System.Text.Json;

namespace Backend.Models;

public class TaskActivity
{
    public int Id { get; set; }
    
    public int TaskCardId { get; set; }
    public TaskCard TaskCard { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string Action { get; set; } = string.Empty; // "Created", "Moved", "Updated", "Commented"
    public string Details { get; set; } = string.Empty; // "Moved from To Do to Done"
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public List<TaskActivityReaction> Reactions { get; set; } = new();
}
