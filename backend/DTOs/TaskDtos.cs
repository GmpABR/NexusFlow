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
    public int? AssigneeId { get; set; } // legacy single (kept for backwards compat)
    public List<int>? AssigneeIds { get; set; } // multi-assignee
    public List<int>? LabelIds { get; set; } // labels
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
    public int? AssigneeId { get; set; } // legacy single (kept for backwards compat)
    public List<int>? AssigneeIds { get; set; } // multi-assignee (authoritative)
    public List<int>? LabelIds { get; set; } // labels
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
    public int? AssigneeId { get; set; }    // legacy single (kept for backwards compat)
    public string? AssigneeName { get; set; }
    public string? AssigneeAvatar { get; set; }
    public string? Tags { get; set; }

    // Time Tracking
    public int TotalTimeSpentMinutes { get; set; } = 0;
    public bool IsTimerRunning { get; set; } = false;

    // Multi-Assignees
    public ICollection<AssigneeDto> Assignees { get; set; } = new List<AssigneeDto>();

    // Labels
    public ICollection<LabelDto> Labels { get; set; } = new List<LabelDto>();

    // Attachments
    public ICollection<AttachmentDto> Attachments { get; set; } = new List<AttachmentDto>();

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

public class AssigneeDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class AttachmentDto
{
    public int Id { get; set; }
    public int TaskCardId { get; set; }
    public int UploadedById { get; set; }
    public string UploadedByUsername { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class CreateAttachmentDto
{
    [Required]
    public string FileName { get; set; } = string.Empty;
    [Required]
    public string StoragePath { get; set; } = string.Empty;
    [Required]
    public string PublicUrl { get; set; } = string.Empty;
    [Required]
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
}
