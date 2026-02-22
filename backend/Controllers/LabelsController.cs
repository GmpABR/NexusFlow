using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

using Backend.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LabelsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<BoardHub> _hubContext;

    public LabelsController(AppDbContext context, IHubContext<BoardHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("board/{boardId}")]
    public async Task<ActionResult<IEnumerable<LabelDto>>> GetBoardLabels(int boardId)
    {
        var labels = await _context.Labels
            .Where(l => l.BoardId == boardId)
            .Select(l => new LabelDto
            {
                Id = l.Id,
                Name = l.Name,
                Color = l.Color,
                BoardId = l.BoardId
            })
            .ToListAsync();

        return Ok(labels);
    }

    [HttpPost("board/{boardId}")]
    public async Task<ActionResult<LabelDto>> CreateLabel(int boardId, [FromBody] CreateLabelDto dto)
    {
        var label = new Label
        {
            Name = dto.Name,
            Color = dto.Color,
            BoardId = boardId
        };

        _context.Labels.Add(label);
        await _context.SaveChangesAsync();

        var labelDto = new LabelDto
        {
            Id = label.Id,
            Name = label.Name,
            Color = label.Color,
            BoardId = label.BoardId
        };

        await _hubContext.Clients.Group($"board_{boardId}")
            .SendAsync("LabelCreated", labelDto);

        return CreatedAtAction(nameof(GetLabel), new { id = label.Id }, labelDto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LabelDto>> GetLabel(int id)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null) return NotFound();

        return Ok(new LabelDto
        {
            Id = label.Id,
            Name = label.Name,
            Color = label.Color,
            BoardId = label.BoardId
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLabel(int id, [FromBody] UpdateLabelDto dto)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null) return NotFound();

        if (dto.Name != null) label.Name = dto.Name;
        if (dto.Color != null) label.Color = dto.Color;

        await _context.SaveChangesAsync();

        var labelDto = new LabelDto
        {
            Id = label.Id,
            Name = label.Name,
            Color = label.Color,
            BoardId = label.BoardId
        };

        await _hubContext.Clients.Group($"board_{label.BoardId}")
            .SendAsync("LabelUpdated", labelDto);

        return Ok(labelDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLabel(int id)
    {
        var label = await _context.Labels.FindAsync(id);
        if (label == null) return NotFound();

        _context.Labels.Remove(label);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.Group($"board_{label.BoardId}")
            .SendAsync("LabelDeleted", label.Id);

        return NoContent();
    }
}
