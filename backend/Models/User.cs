namespace Backend.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<BoardMember> MemberBoards { get; set; } = new List<BoardMember>();
}
