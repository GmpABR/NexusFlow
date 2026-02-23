namespace Backend.DTOs;

public class NotificationDto
{
    public int Id { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? RelatedId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MarkReadDto
{
    public int? NotificationId { get; set; }
}
