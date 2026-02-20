namespace Backend.Models;

public class TimeLog
{
    public int Id { get; set; }
    
    // The task this time log belongs to
    public int TaskCardId { get; set; }
    public TaskCard TaskCard { get; set; } = null!;

    // The user who logged the time
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StoppedAt { get; set; }
    
    // Total duration in minutes (calculated when stopped, or manually entered)
    public int? DurationMinutes { get; set; }
}
