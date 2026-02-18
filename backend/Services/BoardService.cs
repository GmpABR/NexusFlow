using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class BoardService : IBoardService
{
    private readonly AppDbContext _db;

    public BoardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BoardSummaryDto>> GetBoardsAsync(int userId)
    {
        return await _db.Boards
            .Include(b => b.Workspace).ThenInclude(w => w.Members)
            .Where(b => b.OwnerId == userId 
                     || b.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
                     || (b.Workspace != null && b.Workspace.Members.Any(wm => wm.UserId == userId)))
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                Role = b.OwnerId == userId ? "Owner" : "Member",
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId
            })
            .ToListAsync();
    }

    public async Task<List<BoardSummaryDto>> GetPendingInvitationsAsync(int userId)
    {
        return await _db.Boards
            .Where(b => b.Members.Any(m => m.UserId == userId && m.Status == "Pending"))
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                Role = "Invited",
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId
            })
            .ToListAsync();
    }

    public async Task<BoardDetailDto?> GetBoardDetailAsync(int boardId, int userId)
    {
        // Check if user has access (Owner, Accepted Board Member, or Workspace Member)

        
        // RE-WRITING QUERY TO INCLUDE WORKSPACE MEMBERS
        // We need to fetch the board with logic that checks:
        // 1. Board Owner
        // 2. Board Member (Accepted)
        // 3. Workspace Member (if WorkspaceId exists)
        
        // Providing the logic here instead of re-fetching for efficiency
        
         var boardWithWorkspace = await _db.Boards
            .Include(b => b.Columns.OrderBy(c => c.Order))
                .ThenInclude(c => c.TaskCards.OrderBy(t => t.Order))
            .Include(b => b.Members.Where(m => m.Status == "Accepted"))
                .ThenInclude(m => m.User) // For Board Members list
            .Include(b => b.Workspace)
                .ThenInclude(w => w.Members) // Include workspace members to check access
            .FirstOrDefaultAsync(b => b.Id == boardId);

        if (boardWithWorkspace == null) return null;

        var board = boardWithWorkspace;

        var isMember = board.OwnerId == userId 
                       || board.Members.Any(m => m.UserId == userId)
                       || (board.Workspace != null && board.Workspace.Members.Any(wm => wm.UserId == userId));

        if (!isMember) return null;

        return new BoardDetailDto
        {
            Id = board.Id,
            Name = board.Name,
            CreatedAt = board.CreatedAt,
            OwnerId = board.OwnerId,
            ThemeColor = board.ThemeColor,
            WorkspaceId = board.WorkspaceId,
            Columns = board.Columns.Select(c => new ColumnDto
            {
                Id = c.Id,
                Name = c.Name,
                Order = c.Order,
                TaskCards = c.TaskCards.Select(t => new TaskCardDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Order = t.Order,
                    ColumnId = t.ColumnId,
                    BoardId = board.Id,
                    CreatedAt = t.CreatedAt,
                    Priority = t.Priority,
                    DueDate = t.DueDate,
                    StoryPoints = t.StoryPoints,
                    AssigneeId = t.AssigneeId,
                    AssigneeName = t.Assignee != null ? t.Assignee.Username : null,
                    Tags = t.Tags
                }).ToList()
            }).ToList(),
            Members = board.Members.Select(m => new BoardMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                Username = m.User.Username,
                Email = m.User.Email,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            }).ToList(),
            UserRole = board.OwnerId == userId ? "Owner" : (board.Members.FirstOrDefault(m => m.UserId == userId)?.Role ?? "Member")
        };
    }

    public async Task<BoardSummaryDto> CreateBoardAsync(CreateBoardDto dto, int userId)
    {
        var board = new Board
        {
            Name = dto.Name,
            OwnerId = userId,
            WorkspaceId = dto.WorkspaceId,
            ThemeColor = dto.ThemeColor ?? "blue"
        };

        _db.Boards.Add(board);
        await _db.SaveChangesAsync();

        // Create 3 default columns
        var defaultColumns = new List<Column>
        {
            new() { Name = "To Do", Order = 0, BoardId = board.Id },
            new() { Name = "In Progress", Order = 1, BoardId = board.Id },
            new() { Name = "Done", Order = 2, BoardId = board.Id }
        };

        _db.Columns.AddRange(defaultColumns);
        await _db.SaveChangesAsync();

        return new BoardSummaryDto
        {
            Id = board.Id,
            Name = board.Name,
            CreatedAt = board.CreatedAt,
            Role = "Owner",
            ThemeColor = board.ThemeColor,
            WorkspaceId = board.WorkspaceId
        };
    }

    public async Task<List<BoardMemberDto>> GetBoardMembersAsync(int boardId)
    {
        return await _db.BoardMembers
            .Where(m => m.BoardId == boardId && m.Status == "Accepted")
            .Select(m => new BoardMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                Username = m.User.Username,
                Email = m.User.Email,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            })
            .ToListAsync();
    }

    public async Task<BoardMemberDto?> InviteMemberAsync(int boardId, string username, int inviterId)
    {
        // Only the owner can invite
        var board = await _db.Boards.FindAsync(boardId);
        if (board == null || board.OwnerId != inviterId) return null;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null) return null;

        // Cannot invite yourself
        if (user.Id == inviterId) return null;

        // Check if already a member or invited
        var existing = await _db.BoardMembers
            .FirstOrDefaultAsync(bm => bm.BoardId == boardId && bm.UserId == user.Id);
        
        if (existing != null)
        {
            if (existing.Status == "Accepted") return null; // Already member
            if (existing.Status == "Pending") return null; // Already invited
            
            // If Rejected, re-invite
            existing.Status = "Pending";
            await _db.SaveChangesAsync();
            return new BoardMemberDto
            {
                Id = existing.Id,
                UserId = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = existing.Role,
                JoinedAt = existing.JoinedAt
            };
        }

        var member = new BoardMember
        {
            UserId = user.Id,
            BoardId = boardId,
            Role = "Member",
            Status = "Pending"
        };
        
        _db.BoardMembers.Add(member);
        await _db.SaveChangesAsync();

        return new BoardMemberDto
        {
            Id = member.Id,
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = member.Role,
            JoinedAt = member.JoinedAt
        };
    }

    public async Task<bool> RespondToInvitationAsync(int boardId, int userId, bool accept)
    {
        var member = await _db.BoardMembers
            .FirstOrDefaultAsync(m => m.BoardId == boardId && m.UserId == userId && m.Status == "Pending");
        
        if (member == null) return false;

        if (accept)
        {
            member.Status = "Accepted";
        }
        else
        {
            // We can either remove the record or set to Rejected. 
            // Removing keeps the table cleaner for now.
            _db.BoardMembers.Remove(member);
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveMemberAsync(int boardId, int userId, int requesterId)
    {
        var board = await _db.Boards.FindAsync(boardId);
        if (board == null) return false;

        // Only the owner can remove members
        if (board.OwnerId != requesterId) return false;

        var member = await _db.BoardMembers
            .FirstOrDefaultAsync(bm => bm.BoardId == boardId && bm.UserId == userId);
        if (member == null) return false;

        _db.BoardMembers.Remove(member);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateBoardAsync(int boardId, UpdateBoardDto dto, int requesterId)
    {
        var board = await _db.Boards.FindAsync(boardId);
        if (board == null) return false;

        // Only the owner can update board settings
        if (board.OwnerId != requesterId) return false;

        if (!string.IsNullOrEmpty(dto.Name))
        {
            board.Name = dto.Name;
        }

        if (!string.IsNullOrEmpty(dto.ThemeColor))
        {
            board.ThemeColor = dto.ThemeColor;
        }

        await _db.SaveChangesAsync();
        return true;
    }
}
