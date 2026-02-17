using Backend.DTOs;

namespace Backend.Services;

public interface IBoardService
{
    Task<List<BoardSummaryDto>> GetBoardsAsync(int userId);
    Task<List<BoardSummaryDto>> GetPendingInvitationsAsync(int userId);
    Task<BoardDetailDto?> GetBoardDetailAsync(int boardId, int userId);
    Task<BoardSummaryDto> CreateBoardAsync(CreateBoardDto dto, int userId);
    Task<List<BoardMemberDto>> GetBoardMembersAsync(int boardId);
    Task<BoardMemberDto?> InviteMemberAsync(int boardId, string username, int inviterId);
    Task<bool> RespondToInvitationAsync(int boardId, int userId, bool accept);
    Task<bool> RemoveMemberAsync(int boardId, int userId, int requesterId);
    Task<bool> UpdateBoardAsync(int boardId, UpdateBoardDto dto, int requesterId);
}

