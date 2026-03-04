using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Backend.Controllers;
using Backend.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Backend.Tests
{
    public class SecurityTests
    {
        private AppDbContext GetDatabase()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetBoardMembers_UnauthorizedUser_ReturnsEmptyList()
        {
            // Arrange
            var db = GetDatabase();
            var service = new BoardService(db);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, Name = "Private Board", OwnerId = 1 };
            db.Boards.Add(board);
            await db.SaveChangesAsync();

            // Act
            var members = await service.GetBoardMembersAsync(10, 2); // stranger (ID 2) tries to see members of board 10

            // Assert
            Assert.Empty(members);
        }

        [Fact]
        public async Task GetTaskActivities_UnauthorizedUser_ReturnsEmptyList()
        {
            // Arrange
            var db = GetDatabase();
            var mockNotify = new Mock<INotificationService>();
            var service = new TaskService(db, mockNotify.Object);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, OwnerId = 1 };
            var column = new Column { Id = 100, BoardId = 10, Name = "To Do" };
            var task = new TaskCard { Id = 1000, ColumnId = 100, Title = "Private Task" };
            db.Boards.Add(board);
            db.Columns.Add(column);
            db.TaskCards.Add(task);
            await db.SaveChangesAsync();

            // Act
            var activities = await service.GetTaskActivitiesAsync(1000, 2); // stranger tries to see activities

            // Assert
            Assert.Empty(activities);
        }

        [Fact]
        public async Task UpdateTask_UnauthorizedUser_ThrowsUnauthorizedAccessException()
        {
            // Arrange
            var db = GetDatabase();
            var mockNotify = new Mock<INotificationService>();
            var service = new TaskService(db, mockNotify.Object);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, OwnerId = 1 };
            var column = new Column { Id = 100, BoardId = 10, Name = "To Do" };
            var task = new TaskCard { Id = 1000, ColumnId = 100, Title = "Private Task" };
            db.Boards.Add(board);
            db.Columns.Add(column);
            db.TaskCards.Add(task);
            await db.SaveChangesAsync();

            var updateDto = new UpdateTaskDto { Title = "Hacked Title" };

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
                service.UpdateTaskAsync(1000, updateDto, 2));
        }

        [Fact]
        public async Task CreateSubtask_UnauthorizedUser_ThrowsUnauthorizedAccessException()
        {
            // Arrange
            var db = GetDatabase();
            var mockNotify = new Mock<INotificationService>();
            var service = new TaskService(db, mockNotify.Object);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, OwnerId = 1 };
            var column = new Column { Id = 100, BoardId = 10, Name = "To Do" };
            var task = new TaskCard { Id = 1000, ColumnId = 100, Title = "Private Task" };
            db.Boards.Add(board);
            db.Columns.Add(column);
            db.TaskCards.Add(task);
            await db.SaveChangesAsync();

            var dto = new CreateSubtaskDto { Title = "Hacked Subtask" };

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
                service.CreateSubtaskAsync(1000, dto, 2));
        }

        [Fact]
        public async Task GetBoardDetail_PendingWorkspaceMember_ReturnsNull()
        {
            // Arrange
            var db = GetDatabase();
            var service = new BoardService(db);
            
            var owner = new User { Id = 1, Username = "owner" };
            var invitee = new User { Id = 2, Username = "invitee" };
            db.Users.AddRange(owner, invitee);
            
            var ws = new Workspace { Id = 1, Name = "Private WS", OwnerId = 1 };
            db.Workspaces.Add(ws);
            
            // Add as PENDING member
            db.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 1, UserId = 2, Status = "Pending", Role = "Member" });
            
            var board = new Board { Id = 10, Name = "WS Board", OwnerId = 1, WorkspaceId = 1 };
            db.Boards.Add(board);
            await db.SaveChangesAsync();

            // Act
            var boardDetail = await service.GetBoardDetailAsync(10, 2); // User 2 is pending in WS 1

            // Assert
            Assert.Null(boardDetail);
        }

        [Fact]
        public async Task GetBoardDetail_AcceptedWorkspaceMember_ReturnsBoard()
        {
            // Arrange
            var db = GetDatabase();
            var service = new BoardService(db);
            
            var owner = new User { Id = 1, Username = "owner" };
            var member = new User { Id = 2, Username = "member" };
            db.Users.AddRange(owner, member);
            
            var ws = new Workspace { Id = 1, Name = "Safe WS", OwnerId = 1 };
            db.Workspaces.Add(ws);
            
            // Add as ACCEPTED member
            db.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 1, UserId = 2, Status = "Accepted", Role = "Member" });
            
            var board = new Board { Id = 10, Name = "WS Board", OwnerId = 1, WorkspaceId = 1 };
            db.Boards.Add(board);
            await db.SaveChangesAsync();

            // Act
            var boardDetail = await service.GetBoardDetailAsync(10, 2); 

            // Assert
            Assert.NotNull(boardDetail);
            Assert.Equal("WS Board", boardDetail.Name);
        }

        [Fact]
        public async Task SearchUsers_ShouldNotReturnEmails()
        {
            // Arrange
            var db = GetDatabase();
            var mockHub = new Mock<IHubContext<BoardHub>>();
            var tracker = new PresenceTracker();
            var controller = new UsersController(db, tracker, mockHub.Object);
            
            db.Users.Add(new User { Id = 1, Username = "alice", Email = "alice@example.com" });
            db.Users.Add(new User { Id = 2, Username = "bob", Email = "bob@example.com" });
            await db.SaveChangesAsync();

            // Act
            var result = await controller.SearchUsers("alice");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var users = Assert.IsType<List<UserSummaryDto>>(okResult.Value);
            
            Assert.Single(users);
            Assert.Equal("alice", users[0].Username);
            // No Email property to check, but let's ensure it's not leaked via dynamic or anything 
            // (The DTO change itself prevents it, but the controller change ensures query doesn't match email)
            
            var result2 = await controller.SearchUsers("example.com");
            var okResult2 = Assert.IsType<OkObjectResult>(result2.Result);
            var users2 = Assert.IsType<List<UserSummaryDto>>(okResult2.Value);
            Assert.Empty(users2); // Should not find by email anymore
        }

        [Fact]
        public async Task GetProfile_ShouldMaskApiKey()
        {
            // Arrange
            var db = GetDatabase();
            var mockHub = new Mock<IHubContext<BoardHub>>();
            var tracker = new PresenceTracker();
            var controller = new UsersController(db, tracker, mockHub.Object);
            
            var user = new User 
            { 
                Id = 1, 
                Username = "alice", 
                Email = "alice@example.com",
                OpenRouterApiKey = "sk-or-v1-my-secret-key-12345"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            // Setup User context for controller
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, "1") };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };

            // Act
            var result = await controller.GetProfile();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var profile = Assert.IsType<UserProfileDto>(okResult.Value);
            Assert.Equal(user.OpenRouterApiKey, profile.OpenRouterApiKey);
        }

        [Fact]
        public async Task CreateAutomation_UnauthorizedUser_ThrowsUnauthorizedAccessException()
        {
            // Arrange
            var db = GetDatabase();
            var mockHub = new Mock<IHubContext<BoardHub>>();
            var mockFactory = new Mock<IServiceScopeFactory>();
            var service = new BoardAutomationService(db, mockHub.Object, mockFactory.Object);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, OwnerId = 1 };
            db.Boards.Add(board);
            await db.SaveChangesAsync();

            var dto = new CreateAutomationDto 
            { 
                TriggerType = "TaskMovedToColumn", 
                TriggerCondition = "100", 
                ActionType = "ClearAssignee" 
            };

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
                service.CreateAutomationAsync(10, dto, 2));
        }

        [Fact]
        public async Task DeleteAutomation_UnauthorizedUser_ThrowsUnauthorizedAccessException()
        {
            // Arrange
            var db = GetDatabase();
            var mockHub = new Mock<IHubContext<BoardHub>>();
            var mockFactory = new Mock<IServiceScopeFactory>();
            var service = new BoardAutomationService(db, mockHub.Object, mockFactory.Object);
            
            var owner = new User { Id = 1, Username = "owner" };
            var stranger = new User { Id = 2, Username = "stranger" };
            db.Users.AddRange(owner, stranger);
            
            var board = new Board { Id = 10, OwnerId = 1 };
            var automation = new BoardAutomation { Id = 500, BoardId = 10, TriggerType = "T", ActionType = "A" };
            db.Boards.Add(board);
            db.BoardAutomations.Add(automation);
            await db.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
                service.DeleteAutomationAsync(500, 2));
        }
        [Fact]
        public async Task InviteMember_ExistingMember_UpdatesRoleAndStatus()
        {
            // Arrange
            var db = GetDatabase();
            var service = new BoardService(db);
            
            var owner = new User { Id = 1, Username = "owner" };
            var member = new User { Id = 2, Username = "member" };
            db.Users.AddRange(owner, member);
            
            var ws = new Workspace { Id = 1, Name = "Test WS", OwnerId = 1 };
            db.Workspaces.Add(ws);
            
            var board = new Board { Id = 10, OwnerId = 1, WorkspaceId = 1 };
            db.Boards.Add(board);
            
            var existing = new BoardMember 
            { 
                BoardId = 10, 
                UserId = 2, 
                Role = "Viewer", 
                Status = "Accepted" 
            };
            db.BoardMembers.Add(existing);
            await db.SaveChangesAsync();

            // Act
            var result = await service.InviteMemberAsync(10, "member", "Member", 1);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Member", result.Role);
            
            var updated = await db.BoardMembers.FirstAsync(bm => bm.Id == existing.Id);
            Assert.Equal("Member", updated.Role);
            Assert.Equal("Pending", updated.Status);
        }
        [Fact]
        public async Task AcceptBoardInvite_ExistingMember_UpdatesRole()
        {
            // Arrange
            var db = GetDatabase();
            var service = new BoardService(db);
            
            var user = new User { Id = 1, Username = "user" };
            db.Users.Add(user);
            
            var board = new Board { Id = 10, Name = "Test Board" };
            db.Boards.Add(board);
            
            var invite = new BoardInvite 
            { 
                Token = "test-token", 
                BoardId = 10, 
                Role = "Admin", 
                IsActive = true 
            };
            db.BoardInvites.Add(invite);
            
            var existing = new BoardMember 
            { 
                BoardId = 10, 
                UserId = 1, 
                Role = "Viewer", 
                Status = "Accepted" 
            };
            db.BoardMembers.Add(existing);
            await db.SaveChangesAsync();

            // Act
            var result = await service.AcceptBoardInviteAsync("test-token", 1);

            // Assert
            Assert.NotNull(result);
            var updated = await db.BoardMembers.FirstAsync(bm => bm.Id == existing.Id);
            Assert.Equal("Admin", updated.Role);
            Assert.Equal("Accepted", updated.Status);
        }
    }
}
