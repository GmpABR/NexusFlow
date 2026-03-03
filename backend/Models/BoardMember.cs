namespace Backend.Models;

public class BoardMember
{
    public int Id { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public string Role { get; set; } = "Member"; // "Owner" | "Admin" | "Member"
    public string Status { get; set; } = "Pending"; // "Pending" | "Accepted" | "Rejected"

    // Foreign Keys
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int BoardId { get; set; }
    public Board Board { get; set; } = null!;
}
