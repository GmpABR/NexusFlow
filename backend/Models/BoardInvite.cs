using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class BoardInvite
{
    public int Id { get; set; }
    
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    public string Role { get; set; } = "Member"; // "Member" | "Viewer"
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Foreign Keys
    public int BoardId { get; set; }
    public Board Board { get; set; } = null!;

    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;
}
