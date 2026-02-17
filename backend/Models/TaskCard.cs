namespace Backend.Models;

public class TaskCard
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Scrum Fields
    public string Priority { get; set; } = "Low"; // Low, Medium, High, Urgent
    public DateTime? DueDate { get; set; }
    public int? StoryPoints { get; set; }
    public string? Tags { get; set; } // Comma-separated
    
    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    // Foreign Key
    public int ColumnId { get; set; }
    public Column Column { get; set; } = null!;
}
