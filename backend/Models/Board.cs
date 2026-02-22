namespace Backend.Models;

public class Board
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Theme & Settings
    public string ThemeColor { get; set; } = "blue"; 
    public string? BackgroundImageUrl { get; set; }
    public bool IsPrivate { get; set; } = false;

    // Foreign Key to Owner
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    // Foreign Key to Workspace (Nullable for now to support old boards, or plan migration)
    public int? WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    // Navigation
    public ICollection<Column> Columns { get; set; } = new List<Column>();
    public ICollection<BoardMember> Members { get; set; } = new List<BoardMember>();
    public ICollection<Label> Labels { get; set; } = new List<Label>();
}
