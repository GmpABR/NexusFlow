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
    Task<TaskActivity> AddCommentAsync(int taskId, string text, int userId);

    // Time Tracking Methods
    Task<TimeLogDto?> StartTimerAsync(int taskId, int userId);
    Task<TimeLogDto?> StopTimerAsync(int taskId, int userId, DateTime? stoppedAt = null);
    Task<TimeLogDto> AddManualTimeLogAsync(int taskId, int userId, AddManualTimeLogDto dto);
    Task<bool> DeleteTimeLogAsync(int timeLogId, int userId);
    Task<List<TimeLogDto>> GetTaskTimeLogsAsync(int taskId);

    // Attachment Methods
    Task<List<AttachmentDto>> GetAttachmentsAsync(int taskId);
    Task<AttachmentDto> AddAttachmentAsync(int taskId, CreateAttachmentDto dto, int userId);
    Task<bool> DeleteAttachmentAsync(int attachmentId, int userId);
}
