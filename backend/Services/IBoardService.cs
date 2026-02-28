using Backend.DTOs;

namespace Backend.Services;

public interface IBoardService
{
    Task<List<BoardSummaryDto>> GetBoardsAsync(int userId);
    Task<List<BoardSummaryDto>> GetPendingInvitationsAsync(int userId);
    Task<BoardDetailDto?> GetBoardDetailAsync(int boardId, int userId);
    Task<BoardSummaryDto> CreateBoardAsync(CreateBoardDto dto, int userId);
    Task<List<BoardMemberDto>> GetBoardMembersAsync(int boardId, int userId);
    Task<BoardMemberDto?> InviteMemberAsync(int boardId, string username, string role, int inviterId);
    Task<BoardMemberDto?> RespondToInvitationAsync(int boardId, int userId, bool accept);
    Task<bool> RemoveMemberAsync(int boardId, int userId, int requesterId);
    Task<bool> UpdateBoardAsync(int boardId, UpdateBoardDto dto, int requesterId);
    Task<bool> CloseBoardAsync(int boardId, int requesterId);
    Task<bool> ReopenBoardAsync(int boardId, int requesterId);
    Task<bool> DeleteBoardAsync(int boardId, int requesterId);
    Task<ColumnDto> CreateColumnAsync(int boardId, CreateColumnDto dto, int userId);
    Task<bool> MoveColumnAsync(int boardId, int columnId, int newOrder, int userId);
    Task<bool> DeleteColumnAsync(int boardId, int columnId, int userId);
    Task<ColumnDto?> UpdateColumnAsync(int boardId, int columnId, UpdateColumnDto dto, int userId);
    
    // Invite Link Management
    Task<BoardInviteDto> CreateBoardInviteAsync(int boardId, string role, int requesterId);
    Task<BoardInviteDto?> GetBoardInviteByTokenAsync(string token);
    Task<BoardMemberDto?> AcceptBoardInviteAsync(string token, int userId);
}

