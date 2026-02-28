using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace Backend.Tests;

public class AuthServiceTests
{
    private readonly AppDbContext _context;
    private readonly Mock<IConfiguration> _configMock;
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        // Use a unique database name for each test run to ensure isolation
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new AppDbContext(options);
        _configMock = new Mock<IConfiguration>();
        
        // Setup mock config for JWT
        _configMock.Setup(c => c.GetSection("JwtSettings:SecretKey").Value).Returns("SuperSecretKeyAtLeast32CharactersLong!!");
        _configMock.Setup(c => c.GetSection("JwtSettings:Issuer").Value).Returns("NexusFlowBackend");
        _configMock.Setup(c => c.GetSection("JwtSettings:Audience").Value).Returns("NexusFlowFrontend");
        
        // Setup for GetSection("JwtSettings")["SecretKey"] style access as seen in AuthService
        var jwtSectionMock = new Mock<IConfigurationSection>();
        jwtSectionMock.Setup(s => s["SecretKey"]).Returns("SuperSecretKeyAtLeast32CharactersLong!!");
        jwtSectionMock.Setup(s => s["Issuer"]).Returns("NexusFlowBackend");
        jwtSectionMock.Setup(s => s["Audience"]).Returns("NexusFlowFrontend");
        _configMock.Setup(c => c.GetSection("JwtSettings")).Returns(jwtSectionMock.Object);

        _service = new AuthService(_context, _configMock.Object);
    }

    [Fact]
    public async Task RegisterAsync_ValidUser_CreatesUserAndReturnsToken()
    {
        // Arrange
        var dto = new RegisterDto { Username = "testuser", Email = "test@example.com", Password = "Password123" };

        // Act
        var result = await _service.RegisterAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("testuser", result.Username);
        Assert.NotEmpty(result.Token);
        
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == "testuser");
        Assert.NotNull(user);
        Assert.Equal("test@example.com", user.Email);
        Assert.True(BCrypt.Net.BCrypt.Verify("Password123", user.PasswordHash));
    }

    [Fact]
    public async Task RegisterAsync_ExistingUsername_ThrowsException()
    {
        // Arrange
        _context.Users.Add(new User { Username = "existing", Email = "old@example.com", PasswordHash = "hashed" });
        await _context.SaveChangesAsync();
        
        var dto = new RegisterDto { Username = "existing", Email = "new@example.com", Password = "Password123" };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<Exception>(() => _service.RegisterAsync(dto));
        Assert.Equal("Username already exists.", ex.Message);
    }

    [Fact]
    public async Task RegisterAsync_ExistingEmail_ThrowsException()
    {
        // Arrange
        _context.Users.Add(new User { Username = "olduser", Email = "duplicate@example.com", PasswordHash = "hashed" });
        await _context.SaveChangesAsync();
        
        var dto = new RegisterDto { Username = "newuser", Email = "DUPLICATE@example.com", Password = "Password123" };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<Exception>(() => _service.RegisterAsync(dto));
        Assert.Equal("Email already exists.", ex.Message);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        // Arrange
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("validpass");
        _context.Users.Add(new User { Username = "loginuser", Email = "login@example.com", PasswordHash = passwordHash });
        await _context.SaveChangesAsync();

        var dto = new LoginDto { Username = "loginuser", Password = "validpass" };

        // Act
        var result = await _service.LoginAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("loginuser", result.Username);
        Assert.NotEmpty(result.Token);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ReturnsNull()
    {
        // Arrange
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("correctpass");
        _context.Users.Add(new User { Username = "unlucky", Email = "unlucky@example.com", PasswordHash = passwordHash });
        await _context.SaveChangesAsync();

        var dto = new LoginDto { Username = "unlucky", Password = "wrongpass" };

        // Act
        var result = await _service.LoginAsync(dto);

        // Assert
        Assert.Null(result);
    }
}
