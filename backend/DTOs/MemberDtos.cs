using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class InviteMemberDto
{
    [Required]
    public string Username { get; set; } = string.Empty;
}

public class BoardMemberDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public string? AvatarUrl { get; set; }
}
