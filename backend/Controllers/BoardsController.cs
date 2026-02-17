using System.Security.Claims;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BoardsController : ControllerBase
{
    private readonly IBoardService _boardService;
    private readonly IHubContext<BoardHub> _hubContext;

    public BoardsController(IBoardService boardService, IHubContext<BoardHub> hubContext)
    {
        _boardService = boardService;
        _hubContext = hubContext;
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
        var members = await _boardService.GetBoardMembersAsync(id);
        return Ok(members);
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> InviteMember(int id, [FromBody] InviteMemberDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _boardService.InviteMemberAsync(id, dto.Username, userId);
        if (member == null)
            return BadRequest(new { message = "Could not invite user. They may not exist, are already a member, or you are not the owner." });

        // Notify that specific user if online (optional, but good)
        // For now, we update the board group, but really only the owner cares about the "member added" event until they accept.
        // Actually, Trello shows pending members. So broadcasting is fine.
        await _hubContext.Clients.Group($"board_{id}")
            .SendAsync("MemberJoined", member);

        return Ok(member);
    }

    [HttpPost("{id}/invitations/respond")]
    public async Task<IActionResult> RespondToInvitation(int id, [FromBody] InvitationResponseDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _boardService.RespondToInvitationAsync(id, userId, dto.Accept);
        
        if (!result) return NotFound("Invitation not found or already processed.");

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
}


