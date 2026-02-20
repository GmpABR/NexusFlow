using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class CreateTaskDto
{
    [Required, MinLength(1)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public string Priority { get; set; } = "Low";
    public DateTime? DueDate { get; set; }
    public int? StoryPoints { get; set; }
    public int? AssigneeId { get; set; }
    public string? Tags { get; set; }

    [Required]
    public int ColumnId { get; set; }
}

public class UpdateTaskDto
{
    [Required, MinLength(1)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Low";
    public DateTime? DueDate { get; set; }
    public int? StoryPoints { get; set; }
    public int? AssigneeId { get; set; } // 0 or null to unassign
    public string? Tags { get; set; }
}

public class TaskCardDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
    public int ColumnId { get; set; }
    public int BoardId { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public string Priority { get; set; } = "Low";
    public DateTime? DueDate { get; set; }
    public int? StoryPoints { get; set; }
    public int? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string? AssigneeAvatar { get; set; }
    public string? Tags { get; set; }

    // Time Tracking
    public int TotalTimeSpentMinutes { get; set; } = 0;
    public bool IsTimerRunning { get; set; } = false;

    public ICollection<SubtaskDto> Subtasks { get; set; } = new List<SubtaskDto>();
}

public class SubtaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int TaskCardId { get; set; }
}

public class CreateSubtaskDto
{
    [Required, MinLength(1)]
    public string Title { get; set; } = string.Empty;
}

public class UpdateSubtaskDto
{
    public string? Title { get; set; }
    public bool? IsCompleted { get; set; }
}

public class MoveTaskDto
{
    [Required]
    public int TargetColumnId { get; set; }
    public int NewOrder { get; set; }
}

public class AddCommentDto
{
    [Required, MinLength(1)]
    public string Text { get; set; } = string.Empty;
}
