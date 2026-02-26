namespace Backend.DTOs;

public class AutomationDto
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public string TriggerType { get; set; } = string.Empty;
    public string TriggerCondition { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionValue { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateAutomationDto
{
    public string TriggerType { get; set; } = string.Empty;
    public string TriggerCondition { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionValue { get; set; } = string.Empty;
}
