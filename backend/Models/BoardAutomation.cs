using System.Text.Json.Serialization;

namespace Backend.Models;

public class BoardAutomation
{
    public int Id { get; set; }

    public int BoardId { get; set; }
    
    [JsonIgnore]
    public Board Board { get; set; } = null!;

    // Trigger Definition
    public string TriggerType { get; set; } = string.Empty; // e.g., "TaskMovedToColumn"
    
    public string TriggerCondition { get; set; } = string.Empty; // e.g., the specific Column ID

    // Action Definition
    public string ActionType { get; set; } = string.Empty; // e.g., "AssignToUser", "CompleteSubtasks"
    
    public string ActionValue { get; set; } = string.Empty; // e.g., the User ID

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
