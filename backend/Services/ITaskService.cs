using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface ITaskService
{
    Task<TaskCardDto> CreateTaskAsync(CreateTaskDto dto, int userId);
    Task<TaskCardDto?> UpdateTaskAsync(int taskId, UpdateTaskDto dto, int userId);
    Task<TaskCardDto?> MoveTaskAsync(int taskId, MoveTaskDto dto, int userId);
    Task<int?> DeleteTaskAsync(int taskId, int userId); // Returns BoardId if successful
    
    // Subtask Methods
    Task<SubtaskDto> CreateSubtaskAsync(int taskId, CreateSubtaskDto dto, int userId);
    Task<SubtaskDto?> UpdateSubtaskAsync(int subtaskId, UpdateSubtaskDto dto, int userId);
    Task<bool> DeleteSubtaskAsync(int subtaskId, int userId);
    
    Task<TaskCardDto?> GetTaskByIdAsync(int taskId);
    Task<List<TaskActivity>> GetTaskActivitiesAsync(int taskId);
}
