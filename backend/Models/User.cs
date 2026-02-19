namespace Backend.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? FullName { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Organization { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<BoardMember> MemberBoards { get; set; } = new List<BoardMember>();
}
