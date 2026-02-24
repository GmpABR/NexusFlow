namespace Backend.DTOs;

public class UserSummaryDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class UserProfileDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? FullName { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Organization { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public string ThemePreference { get; set; } = "dark";
    public string? OpenRouterApiKey { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateProfileDto
{
    public string? AvatarUrl { get; set; }
    public string? Username { get; set; }
    public string? FullName { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Organization { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public string? ThemePreference { get; set; }
    public string? OpenRouterApiKey { get; set; }
}

public class MyTaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Low";
    public DateTime? DueDate { get; set; }
    public int? StoryPoints { get; set; }
    public string? Tags { get; set; }
    public int ColumnId { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public int BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
}
