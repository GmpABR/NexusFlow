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
                     || (b.Workspace != null && b.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted")))
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
            .AsNoTracking()
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
        // Combined Query: Checks existence + access + projects result in one go.
        // Returns null if board doesn't exist OR user has no access.
        var boardDto = await _db.Boards
            .AsNoTracking()
            .Where(b => b.Id == boardId && (
                b.OwnerId == userId 
                || b.Members.Any(m => m.UserId == userId && m.Status == "Accepted")
                || (b.Workspace != null && b.Workspace.Members.Any(wm => wm.UserId == userId && wm.Status == "Accepted"))
            ))
            .Select(b => new BoardDetailDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                OwnerId = b.OwnerId,
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId,
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
                    AvatarUrl = m.User.AvatarUrl
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
                    AvatarUrl = owner.AvatarUrl
                });
            }

            // Workspace members are implicitly members of the board
            if (boardDto.WorkspaceId.HasValue)
            {
                var wsMembers = await _db.WorkspaceMembers
                    .Include(wm => wm.User)
                    .Where(wm => wm.WorkspaceId == boardDto.WorkspaceId.Value && wm.Status == "Accepted")
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
                            AvatarUrl = wm.User.AvatarUrl
                        });
                    }
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
                JoinedAt = m.JoinedAt,
                AvatarUrl = m.User.AvatarUrl
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
                JoinedAt = existing.JoinedAt,
                AvatarUrl = user.AvatarUrl
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
            JoinedAt = member.JoinedAt,
            AvatarUrl = user.AvatarUrl
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
}
