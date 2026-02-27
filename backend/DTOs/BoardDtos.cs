using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class CreateBoardDto
{
    [Required, MinLength(1)]
    public string Name { get; set; } = string.Empty;
    [Required]
    public int WorkspaceId { get; set; }
    public string ThemeColor { get; set; } = "blue";
    public bool SkipDefaultColumns { get; set; } = false;
}

public class BoardSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Role { get; set; } = "Owner";
    public string ThemeColor { get; set; } = "blue";
    public int WorkspaceId { get; set; }
    public bool IsClosed { get; set; }
    public int OpenTasksCount { get; set; }
}

public class ColumnDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public List<TaskCardDto> TaskCards { get; set; } = new();
}

public class BoardDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int OwnerId { get; set; }
    public string ThemeColor { get; set; } = "blue";
    public int WorkspaceId { get; set; }
    public bool IsClosed { get; set; }
    public List<ColumnDto> Columns { get; set; } = new();
    public List<BoardMemberDto> Members { get; set; } = new();
    public List<LabelDto> Labels { get; set; } = new();
    public string UserRole { get; set; } = "Member";
}
public class UpdateBoardDto
{
    [MinLength(1)]
    public string? Name { get; set; }
    public string? ThemeColor { get; set; }
}

public class CreateColumnDto
{
    [Required, MinLength(1)]
    public string Name { get; set; } = string.Empty;
}

public class MoveColumnDto
{
    public int NewOrder { get; set; }
}

public class UpdateColumnDto
{
    [Required, MinLength(1)]
    public string Name { get; set; } = string.Empty;
}

public class BoardInviteDto
{
    public string Token { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
