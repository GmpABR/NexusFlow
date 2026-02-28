using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

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
    }
}
