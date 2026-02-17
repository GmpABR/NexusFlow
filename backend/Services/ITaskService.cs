using Backend.DTOs;

namespace Backend.Services;

public interface ITaskService
{
    Task<TaskCardDto> CreateTaskAsync(CreateTaskDto dto);
    Task<TaskCardDto?> UpdateTaskAsync(int taskId, UpdateTaskDto dto);
    Task<TaskCardDto?> MoveTaskAsync(int taskId, MoveTaskDto dto);
    Task<int?> DeleteTaskAsync(int taskId); // Returns BoardId if successful
}
