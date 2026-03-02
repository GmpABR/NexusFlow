using System.Security.Claims;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BoardsController : ControllerBase
{
    private readonly IBoardService _boardService;
    private readonly IHubContext<BoardHub> _hubContext;
    private readonly AppDbContext _context;

    public BoardsController(IBoardService boardService, IHubContext<BoardHub> hubContext, AppDbContext context)
    {
        _boardService = boardService;
        _hubContext = hubContext;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetBoards()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var boards = await _boardService.GetBoardsAsync(userId);
        return Ok(boards);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBoard([FromBody] CreateBoardDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var board = await _boardService.CreateBoardAsync(dto, userId);

        // Notify all workspace members about the new board
        var workspaceMembers = await _context.WorkspaceMembers
            .Where(wm => wm.WorkspaceId == dto.WorkspaceId && wm.Status == "Accepted")
            .Select(wm => wm.UserId)
            .ToListAsync();

        var workspaceOwnerId = await _context.Workspaces
            .Where(w => w.Id == dto.WorkspaceId)
            .Select(w => w.OwnerId)
            .FirstOrDefaultAsync();
            
        var usersToNotify = new HashSet<int>(workspaceMembers);
        usersToNotify.Add(workspaceOwnerId);

        foreach (var memberId in usersToNotify)
        {
            await _hubContext.Clients.Group($"user_{memberId}")
                .SendAsync("BoardCreated", board);
        }

        return CreatedAtAction(nameof(GetBoardDetail), new { id = board.Id }, board);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBoardDetail(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var board = await _boardService.GetBoardDetailAsync(id, userId);
        if (board == null) return NotFound();
        return Ok(board);
    }

    [HttpGet("invitations")]
    public async Task<IActionResult> GetPendingInvitations()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invitations = await _boardService.GetPendingInvitationsAsync(userId);
        return Ok(invitations);
    }

    // ── Member Management ──

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var members = await _boardService.GetBoardMembersAsync(id, userId);
        return Ok(members);
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> InviteMember(int id, [FromBody] InviteMemberDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _boardService.InviteMemberAsync(id, dto.Username, dto.Role, userId);
        if (member == null)
            return BadRequest(new { message = "Could not invite user. They may not exist or you are not the owner." });

        // Notify that specific user if online
        await _hubContext.Clients.Group($"user_{member.UserId}")
            .SendAsync("BoardInvitationReceived", member);

        return Ok(member);
    }

    [HttpPost("{id}/invitations/respond")]
    public async Task<IActionResult> RespondToInvitation(int id, [FromBody] InvitationResponseDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _boardService.RespondToInvitationAsync(id, userId, dto.Accept);
        
        if (member == null && dto.Accept) return NotFound("Invitation not found or already processed.");

        if (member != null)
        {
            await _hubContext.Clients.Group($"board_{id}")
                .SendAsync("MemberJoined", member);
        }

        return Ok(new { message = dto.Accept ? "Invitation accepted" : "Invitation declined" });
    }
    

    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(int id, int userId)
    {
        var requesterId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.RemoveMemberAsync(id, userId, requesterId);
        if (!result)
            return BadRequest(new { message = "Could not remove member. You may not be the owner." });

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("MemberRemoved", userId);

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBoard(int id, [FromBody] UpdateBoardDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.UpdateBoardAsync(id, dto, userId);
        
        if (!result) return BadRequest(new { message = "Could not update board. You may not be the owner." });

        // Fetch updated details to broadcast
        var updatedBoard = await _boardService.GetBoardDetailAsync(id, userId);
        if (updatedBoard != null)
        {
            await _hubContext.Clients.Group($"board_{id}")
                .SendAsync("BoardUpdated", updatedBoard);
        }

        return Ok(updatedBoard);
    }

    [HttpPut("{id}/close")]
    public async Task<IActionResult> CloseBoard(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.CloseBoardAsync(id, userId);
        
        if (!result) return BadRequest(new { message = "Could not close board. You may not be the owner." });

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("BoardClosed", id);

        return NoContent();
    }

    [HttpPut("{id}/reopen")]
    public async Task<IActionResult> ReopenBoard(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.ReopenBoardAsync(id, userId);
        
        if (!result) return BadRequest(new { message = "Could not reopen board. You may not be the owner." });

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("BoardReopened", id);

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBoard(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.DeleteBoardAsync(id, userId);
        
        if (!result) return BadRequest(new { message = "Could not delete board. It must be closed first and you must be the owner." });

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("BoardDeleted", id);

        return NoContent();
    }

    [HttpPost("{id}/columns")]
    public async Task<IActionResult> CreateColumn(int id, [FromBody] CreateColumnDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try 
        {
            var column = await _boardService.CreateColumnAsync(id, dto, userId);
            
            // Broadcast to other users
            await _hubContext.Clients.Group($"board_{id}")
                .SendAsync("ColumnCreated", column);

            return CreatedAtAction(nameof(GetBoardDetail), new { id = id }, column);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("{id}/columns/{columnId}/move")]
    public async Task<IActionResult> MoveColumn(int id, int columnId, [FromBody] MoveColumnDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.MoveColumnAsync(id, columnId, dto.NewOrder, userId);
        
        if (!result) return BadRequest("Could not move column");

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("ColumnMoved", new { ColumnId = columnId, NewOrder = dto.NewOrder });

        return Ok();
    }

    [HttpDelete("{id}/columns/{columnId}")]
    public async Task<IActionResult> DeleteColumn(int id, int columnId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.DeleteColumnAsync(id, columnId, userId);

        if (!result) return BadRequest("Could not delete column");

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("ColumnDeleted", columnId);

        return Ok();
    }

    [HttpPut("{id}/columns/{columnId}")]
    public async Task<IActionResult> UpdateColumn(int id, int columnId, [FromBody] UpdateColumnDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var column = await _boardService.UpdateColumnAsync(id, columnId, dto, userId);

        if (column == null) return BadRequest("Could not update column");

        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("ColumnUpdated", column);

        return Ok(column);
    }

    [HttpPost("{id}/invites")]
    public async Task<IActionResult> CreateInvite(int id, [FromBody] string role)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var invite = await _boardService.CreateBoardInviteAsync(id, role, userId);
            return Ok(invite);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpGet("invites/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInvite(string token)
    {
        var invite = await _boardService.GetBoardInviteByTokenAsync(token);
        if (invite == null) return NotFound("Invite not found or expired.");
        return Ok(invite);
    }

    [HttpPost("invites/{token}/join")]
    public async Task<IActionResult> JoinBoard(string token)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _boardService.AcceptBoardInviteAsync(token, userId);
        
        if (member == null) return BadRequest("Could not join board.");

        // Notify other board members that someone has joined
        await _hubContext.Clients.Group($"board_{member.BoardId}")
            .SendAsync("MemberJoined", member);
        
        return Ok(member);
    }
}


