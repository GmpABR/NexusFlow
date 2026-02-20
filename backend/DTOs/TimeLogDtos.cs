namespace Backend.DTOs;

public class StartTimerDto
{
    public int TaskCardId { get; set; }
}

public class StopTimerDto
{
    // Optionally allow passing the Stop time manually, otherwise use UtcNow
    public DateTime? StoppedAt { get; set; } 
}

public class AddManualTimeLogDto
{
    public int TaskCardId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime StoppedAt { get; set; }
}

public class TimeLogDto
{
    public int Id { get; set; }
    public int TaskCardId { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? StoppedAt { get; set; }
    public int? DurationMinutes { get; set; }
}
