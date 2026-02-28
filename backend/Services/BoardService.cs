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
            .AsNoTracking()
            .Where(b => b.OwnerId == userId 
                     || b.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
                     || (b.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted")))
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                Role = b.OwnerId == userId ? "Owner" : "Member",
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId,
                IsClosed = b.IsClosed,
                OpenTasksCount = b.Columns.SelectMany(c => c.TaskCards)
                    .Count(t => !t.Column.Name.ToLower().Contains("done") && !t.Column.Name.ToLower().Contains("complete"))
            })
            .ToListAsync();
    }

    public async Task<List<BoardSummaryDto>> GetPendingInvitationsAsync(int userId)
    {
        return await _db.Boards
            .AsNoTracking()
            .Where(b => b.Members.Any(m => m.UserId == userId && m.Status == "Pending"))
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                Role = "Invited",
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId,
                IsClosed = b.IsClosed,
                OpenTasksCount = b.Columns.SelectMany(c => c.TaskCards)
                    .Count(t => !t.Column.Name.ToLower().Contains("done") && !t.Column.Name.ToLower().Contains("complete"))
            })
            .ToListAsync();
    }

    public async Task<BoardDetailDto?> GetBoardDetailAsync(int boardId, int userId)
    {
        // Combined Query: Checks existence + access + projects result in one go.
        // Returns null if board doesn't exist OR user has no access.
        var boardDto = await _db.Boards
            .AsNoTracking()
            .AsSplitQuery()
            .Where(b => b.Id == boardId && (
                b.OwnerId == userId 
                || b.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
                || (b.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"))
            ))
            .Select(b => new BoardDetailDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                OwnerId = b.OwnerId,
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId,
                IsClosed = b.IsClosed,
                Columns = b.Columns.OrderBy(c => c.Order).Select(c => new ColumnDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Order = c.Order,
                    TaskCards = c.TaskCards.OrderBy(t => t.Order).Select(t => new TaskCardDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        Order = t.Order,
                        ColumnId = t.ColumnId,
                        BoardId = b.Id,
                        CreatedAt = t.CreatedAt,
                        Priority = t.Priority,
                        DueDate = t.DueDate,
                        StoryPoints = t.StoryPoints,
                        AssigneeId = t.AssigneeId,
                        AssigneeName = t.Assignee != null ? t.Assignee.Username : null,
                        Tags = t.Tags,
                        TotalTimeSpentMinutes = t.TimeLogs
                            .Where(tl => tl.DurationMinutes.HasValue)
                            .Sum(tl => tl.DurationMinutes!.Value),
                        IsTimerRunning = t.TimeLogs.Any(tl => tl.StoppedAt == null),
                        // Multi-assignees
                        Assignees = t.Assignees
                            .Select(ta => new AssigneeDto { UserId = ta.UserId, Username = ta.User.Username, AvatarUrl = ta.User.AvatarUrl })
                            .ToList(),
                        // Attachments
                        Attachments = t.Attachments
                            .OrderByDescending(a => a.UploadedAt)
                            .Select(a => new AttachmentDto
                            {
                                Id = a.Id,
                                TaskCardId = a.TaskCardId,
                                UploadedById = a.UploadedById,
                                UploadedByUsername = a.UploadedBy.Username,
                                FileName = a.FileName,
                                StoragePath = a.StoragePath,
                                PublicUrl = a.PublicUrl,
                                ContentType = a.ContentType,
                                FileSizeBytes = a.FileSizeBytes,
                                UploadedAt = a.UploadedAt
                            }).ToList(),
                        Subtasks = t.Subtasks.OrderBy(s => s.Id).Select(s => new SubtaskDto
                        {
                            Id = s.Id,
                            Title = s.Title,
                            IsCompleted = s.IsCompleted,
                            TaskCardId = s.TaskCardId
                        }).ToList(),
                        Labels = t.Labels.Select(tl => new LabelDto
                        {
                            Id = tl.Label.Id,
                            Name = tl.Label.Name,
                            Color = tl.Label.Color,
                            BoardId = tl.Label.BoardId
                        }).ToList()
                    }).ToList()
                }).ToList(),
                Labels = b.Labels.Select(l => new LabelDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Color = l.Color,
                    BoardId = l.BoardId
                }).ToList(),
                Members = b.Members.Where(m => m.Status == "Accepted").Select(m => new BoardMemberDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Email = m.User.Email,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt,
                    AvatarUrl = m.User.AvatarUrl,
                    IsWorkspaceMember = false,
                    BoardId = m.BoardId
                }).ToList(),
                UserRole = b.OwnerId == userId ? "Owner" : (b.Members.Where(m => m.UserId == userId).Select(m => m.Role).FirstOrDefault() ?? "Member") 
                // Handle null coalescing properly.
            })
            .FirstOrDefaultAsync();

        if (boardDto != null)
        {
            // Owner is implicitly a member
            var owner = await _db.Users.FindAsync(boardDto.OwnerId);
            if (owner != null && !boardDto.Members.Any(m => m.UserId == owner.Id))
            {
                boardDto.Members.Add(new BoardMemberDto
                {
                    Id = 0,
                    UserId = owner.Id,
                    Username = owner.Username,
                    Email = owner.Email,
                    Role = "Owner",
                    JoinedAt = boardDto.CreatedAt,
                    AvatarUrl = owner.AvatarUrl,
                    IsWorkspaceMember = false,
                    BoardId = boardDto.Id
                });
            }

            // Workspace members are implicitly members of the board
            var wsMembers = await _db.WorkspaceMembers
                .Include(wm => wm.User)
                .Where(wm => wm.WorkspaceId == boardDto.WorkspaceId && wm.Status == "Accepted")
                .ToListAsync();
                
            foreach (var wm in wsMembers)
            {
                if (!boardDto.Members.Any(m => m.UserId == wm.UserId))
                {
                    boardDto.Members.Add(new BoardMemberDto
                    {
                        Id = wm.Id,
                        UserId = wm.UserId,
                        Username = wm.User.Username,
                        Email = wm.User.Email,
                        Role = wm.Role,
                        JoinedAt = wm.JoinedAt,
                        AvatarUrl = wm.User.AvatarUrl,
                        IsWorkspaceMember = true,
                        BoardId = boardDto.Id
                    });
                }
            }
        }

        return boardDto;
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

        if (!dto.SkipDefaultColumns)
        {
            // Create 3 default columns
            var defaultColumns = new List<Column>
            {
                new() { Name = "To Do", Order = 0, BoardId = board.Id },
                new() { Name = "In Progress", Order = 1, BoardId = board.Id },
                new() { Name = "Done", Order = 2, BoardId = board.Id }
            };

            _db.Columns.AddRange(defaultColumns);
            await _db.SaveChangesAsync();
        }

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

    public async Task<List<BoardMemberDto>> GetBoardMembersAsync(int boardId, int userId)
    {
        // Check if user has access to the board
        var hasAccess = await _db.Boards
            .Where(b => b.Id == boardId)
            .AnyAsync(b => b.OwnerId == userId 
                     || b.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
                     || (b.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted")));

        if (!hasAccess) return new List<BoardMemberDto>();

        return await _db.BoardMembers
            .Where(m => m.BoardId == boardId && m.Status == "Accepted")
            .Select(m => new BoardMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                Username = m.User.Username,
                Email = m.User.Email,
                Role = m.Role,
                JoinedAt = m.JoinedAt,
                AvatarUrl = m.User.AvatarUrl,
                IsWorkspaceMember = false,
                BoardId = m.BoardId
            })
            .ToListAsync();
    }

    public async Task<BoardMemberDto?> InviteMemberAsync(int boardId, string username, string role, int inviterId)
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
            // Update role and set back to Pending so they can accept/be notified
            existing.Role = role;
            existing.Status = "Pending";
            await _db.SaveChangesAsync();

            return new BoardMemberDto
            {
                Id = existing.Id,
                UserId = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = existing.Role,
                JoinedAt = existing.JoinedAt,
                AvatarUrl = user.AvatarUrl,
                BoardId = boardId
            };
        }

        var member = new BoardMember
        {
            UserId = user.Id,
            BoardId = boardId,
            Role = role,
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
            JoinedAt = member.JoinedAt,
            AvatarUrl = user.AvatarUrl,
            BoardId = boardId
        };
    }

    public async Task<BoardMemberDto?> RespondToInvitationAsync(int boardId, int userId, bool accept)
    {
        var member = await _db.BoardMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.BoardId == boardId && m.UserId == userId && m.Status == "Pending");
        
        if (member == null) return null;

        if (accept)
        {
            member.Status = "Accepted";
            await _db.SaveChangesAsync();
            
            return new BoardMemberDto
            {
                Id = member.Id,
                UserId = member.UserId,
                Username = member.User.Username,
                Email = member.User.Email,
                Role = member.Role,
                JoinedAt = member.JoinedAt,
                AvatarUrl = member.User.AvatarUrl,
                BoardId = boardId
            };
        }
        else
        {
            _db.BoardMembers.Remove(member);
            await _db.SaveChangesAsync();
            return null;
        }
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

    public async Task<bool> CloseBoardAsync(int boardId, int requesterId)
    {
        var board = await _db.Boards.FirstOrDefaultAsync(b => b.Id == boardId);
        
        if (board == null || board.OwnerId != requesterId)
            return false;

        board.IsClosed = true;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ReopenBoardAsync(int boardId, int requesterId)
    {
        var board = await _db.Boards.FirstOrDefaultAsync(b => b.Id == boardId);
        
        if (board == null || board.OwnerId != requesterId)
            return false;

        board.IsClosed = false;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteBoardAsync(int boardId, int requesterId)
    {
        var board = await _db.Boards.FirstOrDefaultAsync(b => b.Id == boardId);
        
        if (board == null || board.OwnerId != requesterId || !board.IsClosed)
            return false;

        _db.Boards.Remove(board);
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<ColumnDto> CreateColumnAsync(int boardId, CreateColumnDto dto, int userId)
    {
        // 1. Verify user has access (Owner or Member)
        var board = await _db.Boards
            .Include(b => b.Members)
            .Include(b => b.Workspace).ThenInclude(w => w.Members)
            .Include(b => b.Columns) // Include columns to calculate Order
            .FirstOrDefaultAsync(b => b.Id == boardId);

        if (board == null) throw new KeyNotFoundException("Board not found");

        var isMember = board.OwnerId == userId 
            || board.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
            || (board.Workspace != null && board.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"));

        if (!isMember) throw new UnauthorizedAccessException("User is not a member of this board");

        // 2. Calculate Order
        var maxOrder = board.Columns.Any() ? board.Columns.Max(c => c.Order) : -1;

        // 3. Create Column
        var column = new Column
        {
            Name = dto.Name,
            BoardId = boardId,
            Order = maxOrder + 1
        };

        _db.Columns.Add(column);
        await _db.SaveChangesAsync();

        return new ColumnDto
        {
            Id = column.Id,
            Name = column.Name,
            Order = column.Order,
            TaskCards = new List<TaskCardDto>()
        };
    }

    public async Task<bool> MoveColumnAsync(int boardId, int columnId, int newOrder, int userId)
    {
        var board = await _db.Boards
            .Include(b => b.Columns)
            .Include(b => b.Members)
            .Include(b => b.Workspace).ThenInclude(w => w.Members)
            .FirstOrDefaultAsync(b => b.Id == boardId);

        if (board == null) return false;

        var isMember = board.OwnerId == userId 
            || board.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
            || (board.Workspace != null && board.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"));

        if (!isMember) return false;

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId);
        if (column == null) return false;

        // Current list sorted by Order
        var columns = board.Columns.OrderBy(c => c.Order).ToList();
        
        // Remove
        columns.Remove(column);

        // Clamped insert
        if (newOrder < 0) newOrder = 0;
        if (newOrder > columns.Count) newOrder = columns.Count;

        columns.Insert(newOrder, column);

        // Re-assign Order
        for (int i = 0; i < columns.Count; i++)
        {
            columns[i].Order = i;
        }

        await _db.SaveChangesAsync();
        return true;
    }
    public async Task<bool> DeleteColumnAsync(int boardId, int columnId, int userId)
    {
        var board = await _db.Boards
            .Include(b => b.Columns)
            .Include(b => b.Members)
            .Include(b => b.Workspace).ThenInclude(w => w.Members)
            .FirstOrDefaultAsync(b => b.Id == boardId);

        if (board == null) return false;

        var isMember = board.OwnerId == userId 
            || board.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
            || (board.Workspace != null && board.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"));

        if (!isMember) return false;

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId);
        if (column == null) return false;

        _db.Columns.Remove(column);

        // Re-index remaining columns to close gap
        var remainingColumns = board.Columns.Where(c => c.Id != columnId).OrderBy(c => c.Order).ToList();
        for (int i = 0; i < remainingColumns.Count; i++)
        {
            remainingColumns[i].Order = i;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ColumnDto?> UpdateColumnAsync(int boardId, int columnId, UpdateColumnDto dto, int userId)
    {
        var board = await _db.Boards
            .Include(b => b.Columns)
            .Include(b => b.Members)
            .Include(b => b.Workspace).ThenInclude(w => w.Members)
            .FirstOrDefaultAsync(b => b.Id == boardId);

        if (board == null) return null;

        var isMember = board.OwnerId == userId 
            || board.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
            || (board.Workspace != null && board.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"));

        if (!isMember) return null;

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId);
        if (column == null) return null;

        column.Name = dto.Name;
        await _db.SaveChangesAsync();

        return new ColumnDto
        {
            Id = column.Id,
            Name = column.Name,
            Order = column.Order,
            TaskCards = new List<TaskCardDto>() // Not returning tasks here for simplicity
        };
    }

    public async Task<BoardInviteDto> CreateBoardInviteAsync(int boardId, string role, int requesterId)
    {
        var board = await _db.Boards.FindAsync(boardId);
        if (board == null || board.OwnerId != requesterId)
            throw new UnauthorizedAccessException("Only the board owner can create invite links.");

        var invite = new BoardInvite
        {
            Token = Guid.NewGuid().ToString("N"),
            BoardId = boardId,
            Role = role,
            CreatorId = requesterId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _db.BoardInvites.Add(invite);
        await _db.SaveChangesAsync();

        return new BoardInviteDto
        {
            Token = invite.Token,
            Role = invite.Role,
            BoardId = invite.BoardId,
            BoardName = board.Name,
            CreatedAt = invite.CreatedAt
        };
    }

    public async Task<BoardInviteDto?> GetBoardInviteByTokenAsync(string token)
    {
        var invite = await _db.BoardInvites
            .Include(i => i.Board)
            .FirstOrDefaultAsync(i => i.Token == token && i.IsActive);

        if (invite == null) return null;

        return new BoardInviteDto
        {
            Token = invite.Token,
            Role = invite.Role,
            BoardId = invite.BoardId,
            BoardName = invite.Board.Name,
            CreatedAt = invite.CreatedAt
        };
    }

    public async Task<BoardMemberDto?> AcceptBoardInviteAsync(string token, int userId)
    {
        var invite = await _db.BoardInvites
            .Include(i => i.Board)
            .FirstOrDefaultAsync(i => i.Token == token && i.IsActive);

        if (invite == null) return null;

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return null;

        BoardMember? member;

        // Check if already a member
        var existing = await _db.BoardMembers
            .FirstOrDefaultAsync(m => m.BoardId == invite.BoardId && m.UserId == userId);

        if (existing != null)
        {
            // Update role from the invite and ensure status is Accepted
            existing.Status = "Accepted";
            existing.Role = invite.Role;
            member = existing;
        }
        else
        {
            member = new BoardMember
            {
                BoardId = invite.BoardId,
                UserId = userId,
                Role = invite.Role,
                Status = "Accepted"
            };
            _db.BoardMembers.Add(member);
        }

        await _db.SaveChangesAsync();

        return new BoardMemberDto
        {
            Id = member.Id,
            UserId = userId,
            Username = user.Username,
            Email = user.Email,
            Role = member.Role,
            JoinedAt = member.JoinedAt,
            AvatarUrl = user.AvatarUrl,
            BoardId = invite.BoardId
        };
    }
}
