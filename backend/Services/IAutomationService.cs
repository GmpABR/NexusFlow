using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface IAutomationService
{
    // Execute automations asynchronously given a task and a specific trigger logic.
    // E.g., moving a task to a new column
    // Automation Management
    Task<List<AutomationDto>> GetAutomationsAsync(int boardId, int userId);
    Task<AutomationDto> CreateAutomationAsync(int boardId, CreateAutomationDto dto, int userId);
    Task<bool> DeleteAutomationAsync(int automationId, int userId);
    // Execute automations asynchronously given a task and a specific trigger logic.
    // E.g., moving a task to a new column
    Task<bool> ExecuteTaskMovedAutomationsAsync(int boardId, int taskId, int newColumnId, int userId);
}
