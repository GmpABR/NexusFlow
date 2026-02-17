using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class WorkspaceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OwnerId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<WorkspaceMemberDto> Members { get; set; } = new();
}

public class CreateWorkspaceDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}

public class UpdateWorkspaceDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}

public class WorkspaceMemberDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Admin, Member, Viewer
    public string Status { get; set; } = "Accepted"; // Default for backward compatibility
    public DateTime JoinedAt { get; set; }
}

public class InvitationResponseDto
{
    public bool Accept { get; set; }
}
