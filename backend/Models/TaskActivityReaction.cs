namespace Backend.Models;

public class TaskActivityReaction
{
    public int Id { get; set; }
    public int TaskActivityId { get; set; }
    public TaskActivity TaskActivity { get; set; } = null!;
    
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string Emoji { get; set; } = string.Empty;
}
