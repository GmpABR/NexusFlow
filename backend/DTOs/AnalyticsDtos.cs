namespace Backend.DTOs;

public class BoardAnalyticsDto
{
    public int BoardId { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int PendingTasks { get; set; }
    
    // For Burn Down Chart: Date -> Tasks Remaining
    public Dictionary<string, int> BurnDownData { get; set; } = new Dictionary<string, int>();

    // For Time Tracking: Username -> Total Minutes Logged
    public Dictionary<string, int> UserTimeData { get; set; } = new Dictionary<string, int>();
}
