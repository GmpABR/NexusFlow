using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<UserSummaryDto>>> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new List<UserSummaryDto>());
        }

        var users = await _context.Users
            .Where(u => u.Username.Contains(query) || u.Email.Contains(query))
            .Take(10)
            .Select(u => new UserSummaryDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email
            })
            .ToListAsync();

        return Ok(users);
    }
}
