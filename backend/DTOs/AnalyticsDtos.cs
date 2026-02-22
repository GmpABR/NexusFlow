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

    public double AverageLeadTimeDays { get; set; }
    public double AverageCycleTimeDays { get; set; }
}

public class WorkspaceAnalyticsDto
{
    public int WorkspaceId { get; set; }
    public int TotalBoards { get; set; }
    public int TotalMembers { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int PendingTasks { get; set; }
    public int OverdueTasks { get; set; }
    public Dictionary<string, int> TasksByPriority { get; set; } = new();
    public Dictionary<string, int> TasksByAssignee { get; set; } = new();
    public Dictionary<string, int> TasksPerBoard { get; set; } = new();
    public List<WorkspaceActivityDto> RecentActivity { get; set; } = new();

    public double AverageLeadTimeDays { get; set; }
    public double AverageCycleTimeDays { get; set; }
}

public class WorkspaceActivityDto
{
    public string Username { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string TaskTitle { get; set; } = string.Empty;
    public string BoardName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
