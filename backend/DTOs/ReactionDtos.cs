namespace Backend.DTOs;

public class TaskActivityReactionDto
{
    public int Id { get; set; }
    public int TaskActivityId { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
}

public class ToggleReactionDto
{
    public string Emoji { get; set; } = string.Empty;
}
