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
    Task<Subtask?> GetSubtaskByIdAsync(int subtaskId);
    
    Task<TaskCardDto?> GetTaskByIdAsync(int taskId, int userId);
    Task<List<TaskActivityDto>> GetTaskActivitiesAsync(int taskId, int userId);
    Task<TaskActivityDto> AddCommentAsync(int taskId, string text, int userId);
    Task<TaskActivityDto?> UpdateActivityAsync(int activityId, string text, int userId);
    Task<bool> DeleteActivityAsync(int activityId, int userId);
    Task<TaskActivityReactionDto?> ToggleReactionAsync(int activityId, string emoji, int userId);

    // Time Tracking Methods
    Task<TimeLogDto?> StartTimerAsync(int taskId, int userId);
    Task<TimeLogDto?> StopTimerAsync(int taskId, int userId, DateTime? stoppedAt = null);
    Task<TimeLogDto> AddManualTimeLogAsync(int taskId, int userId, AddManualTimeLogDto dto);
    Task<bool> DeleteTimeLogAsync(int timeLogId, int userId);
    Task<List<TimeLogDto>> GetTaskTimeLogsAsync(int taskId, int userId);

    // Attachment Methods
    Task<List<AttachmentDto>> GetAttachmentsAsync(int taskId, int userId);
    Task<AttachmentDto> AddAttachmentAsync(int taskId, CreateAttachmentDto dto, int userId);
    Task<bool> DeleteAttachmentAsync(int attachmentId, int userId);

    // Label Methods
    Task<bool> AddLabelToTaskAsync(int taskId, int labelId, int userId);
    Task<bool> RemoveLabelFromTaskAsync(int taskId, int labelId, int userId);
    Task<bool> SetTaskLabelsAsync(int taskId, List<int> labelIds, int userId);
    Task<TaskActivityDto?> GetActivityByIdAsync(int activityId);
}
