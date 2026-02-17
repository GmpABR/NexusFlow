using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class WorkspaceMember
{
    public int Id { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    // Status: "Pending", "Accepted"
    public string Status { get; set; } = "Pending";
    
    // Role: "Admin", "Member", "Viewer"
    public string Role { get; set; } = "Member"; 

    // Foreign Keys
    public int WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
