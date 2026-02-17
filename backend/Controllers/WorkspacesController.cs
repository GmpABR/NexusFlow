using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkspacesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WorkspacesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/workspaces
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkspaceDto>>> GetMyWorkspaces()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var workspaces = await _context.Workspaces
            .Include(w => w.Owner)
            .Include(w => w.Members).ThenInclude(m => m.User)
            .Where(w => w.OwnerId == userId || w.Members.Any(m => m.UserId == userId && m.Status == "Accepted"))
            .Select(w => new WorkspaceDto
            {
                Id = w.Id,
                Name = w.Name,
                Description = w.Description,
                OwnerId = w.OwnerId,
                OwnerName = w.Owner.Username,
                CreatedAt = w.CreatedAt,
                Members = w.Members.Where(m => m.Status == "Accepted").Select(m => new WorkspaceMemberDto
                {
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Role = m.Role,
                    Status = m.Status,
                    JoinedAt = m.JoinedAt
                }).ToList()
            })
            .ToListAsync();

        return Ok(workspaces);
    }

    // ... (GetWorkspace remains mostly the same, maybe filter members too) ...


    // GET: api/workspaces/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<WorkspaceDto>> GetWorkspace(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var workspace = await _context.Workspaces
            .Include(w => w.Owner)
            .Include(w => w.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workspace == null) return NotFound();

        // Check access
        if (workspace.OwnerId != userId && !workspace.Members.Any(m => m.UserId == userId))
        {
            return Forbid();
        }

        return new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Description = workspace.Description,
            OwnerId = workspace.OwnerId,
            OwnerName = workspace.Owner.Username,
            CreatedAt = workspace.CreatedAt,
            Members = workspace.Members.Select(m => new WorkspaceMemberDto
            {
                UserId = m.UserId,
                Username = m.User.Username,
                Role = m.Role,
                Status = m.Status,
                JoinedAt = m.JoinedAt
            }).ToList()
        };
    }

    // POST: api/workspaces
    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> CreateWorkspace(CreateWorkspaceDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var workspace = new Workspace
        {
            Name = dto.Name,
            Description = dto.Description,
            OwnerId = userId
        };

        // Add owner as Admin member automatically
        workspace.Members.Add(new WorkspaceMember
        {
            UserId = userId,
            Role = "Admin"
        });

        _context.Workspaces.Add(workspace);
        await _context.SaveChangesAsync();

        // Reload to get populated data if needed, or just construct DTO
        // We need Owner info
        var owner = await _context.Users.FindAsync(userId);

        return CreatedAtAction(nameof(GetMyWorkspaces), new { id = workspace.Id }, new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Description = workspace.Description,
            OwnerId = workspace.OwnerId,
            OwnerName = owner?.Username ?? "Unknown",
            CreatedAt = workspace.CreatedAt,
            Members = new List<WorkspaceMemberDto>
            {
                new WorkspaceMemberDto
                {
                    UserId = userId,
                    Username = owner?.Username ?? "Unknown",
                    Role = "Admin",
                    Status = "Accepted",
                    JoinedAt = DateTime.UtcNow
                }
            }
        });
    }

    // GET: api/workspaces/{id}/boards
    [HttpGet("{id}/boards")]
    public async Task<ActionResult<IEnumerable<BoardSummaryDto>>> GetWorkspaceBoards(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        // Check access
        var hasAccess = await _context.Workspaces
            .AnyAsync(w => w.Id == id && (w.OwnerId == userId || w.Members.Any(m => m.UserId == userId)));

        if (!hasAccess)
        {
            return Forbid();
        }

        var boards = await _context.Boards
            .Where(b => b.WorkspaceId == id)
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                Name = b.Name,
                CreatedAt = b.CreatedAt,
                Role = b.OwnerId == userId ? "Owner" : "Member", // Simplified logic for now
                ThemeColor = b.ThemeColor,
                WorkspaceId = b.WorkspaceId
            })
            .ToListAsync();

        return Ok(boards);
    }

    // POST: api/workspaces/{id}/members
    [HttpPost("{id}/members")]
    public async Task<ActionResult<WorkspaceMemberDto>> AddMember(int id, [FromBody] InviteMemberDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workspace == null) return NotFound();

        // Check if requester is Owner or Admin
        // For now, allow Owner or any Member? No, usually Admin/Owner.
        // Let's allow Owner for sure.
        // And maybe Members with Role 'Admin'.
        var requesterMember = workspace.Members.FirstOrDefault(m => m.UserId == userId);
        bool isAdmin = workspace.OwnerId == userId || (requesterMember != null && requesterMember.Role == "Admin");

        if (!isAdmin) return Forbid();

        var userToAdd = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
        if (userToAdd == null) return BadRequest(new { message = "User not found." });

        if (workspace.Members.Any(m => m.UserId == userToAdd.Id))
        {
            return BadRequest(new { message = "User is already a member." });
        }

        var newMember = new WorkspaceMember
        {
            WorkspaceId = id,
            UserId = userToAdd.Id,
            Role = "Member", // Default role
            Status = "Pending",
            JoinedAt = DateTime.UtcNow
        };

        _context.WorkspaceMembers.Add(newMember);
        await _context.SaveChangesAsync();

        return Ok(new WorkspaceMemberDto
        {
            UserId = userToAdd.Id,
            Username = userToAdd.Username,
            Role = newMember.Role,
            Status = newMember.Status,
            JoinedAt = newMember.JoinedAt
        });
    }

    // DELETE: api/workspaces/{id}/members/{userId}
    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(int id, int userId)
    {
        var requesterId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workspace == null) return NotFound();

        // Check permissions
        var requesterMember = workspace.Members.FirstOrDefault(m => m.UserId == requesterId);
        bool isAdmin = workspace.OwnerId == requesterId || (requesterMember != null && requesterMember.Role == "Admin");

        // Allow user to leave themselves?
        if (userId == requesterId)
        {
            // Owner cannot leave (must transfer ownership first - not implemented yet)
            if (workspace.OwnerId == requesterId)
            {
                return BadRequest(new { message = "Owner cannot leave the workspace. Delete the workspace or transfer ownership." });
            }
            // Allow leaving
        }
        else if (!isAdmin)
        {
            return Forbid();
        }

        var memberToRemove = workspace.Members.FirstOrDefault(m => m.UserId == userId);
        if (memberToRemove == null) return NotFound("Member not found in this workspace.");

        _context.WorkspaceMembers.Remove(memberToRemove);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/workspaces/invitations
    [HttpGet("invitations")]
    public async Task<ActionResult<IEnumerable<WorkspaceDto>>> GetInvitations()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var invitations = await _context.Workspaces
            .Include(w => w.Owner)
            .Include(w => w.Members).ThenInclude(m => m.User)
            .Where(w => w.Members.Any(m => m.UserId == userId && m.Status == "Pending"))
            .Select(w => new WorkspaceDto
            {
                Id = w.Id,
                Name = w.Name,
                Description = w.Description,
                OwnerId = w.OwnerId,
                OwnerName = w.Owner.Username,
                CreatedAt = w.CreatedAt
            })
            .ToListAsync();

        return Ok(invitations);
    }

    // POST: api/workspaces/{id}/respond
    [HttpPost("{id}/respond")]
    public async Task<IActionResult> RespondToInvitation(int id, [FromBody] InvitationResponseDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var member = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m => m.WorkspaceId == id && m.UserId == userId && m.Status == "Pending");

        if (member == null) return NotFound("Invitation not found.");

        if (dto.Accept)
        {
            member.Status = "Accepted";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Invitation accepted." });
        }
        else
        {
            _context.WorkspaceMembers.Remove(member);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Invitation declined." });
        }
    }
}


