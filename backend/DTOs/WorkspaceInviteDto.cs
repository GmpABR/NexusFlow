using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class WorkspaceInviteDto
{
    public string Token { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int WorkspaceId { get; set; }
    public string WorkspaceName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class CreateWorkspaceInviteDto
{
    [Required]
    public string Role { get; set; } = "Member"; // "Member" | "Admin"
    public int? ExpiresInDays { get; set; }
}
