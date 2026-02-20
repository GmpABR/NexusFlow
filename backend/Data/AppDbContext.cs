using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Board> Boards { get; set; }
    public DbSet<Column> Columns { get; set; }
    public DbSet<TaskCard> TaskCards { get; set; }
    public DbSet<BoardMember> BoardMembers { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<WorkspaceMember> WorkspaceMembers { get; set; }
    public DbSet<Subtask> Subtasks { get; set; }
    public DbSet<TaskActivity> TaskActivities { get; set; }
    public DbSet<TimeLog> TimeLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // Board -> User
        modelBuilder.Entity<Board>(entity =>
        {
            entity.HasOne(b => b.Owner)
                  .WithMany(u => u.Boards)
                  .HasForeignKey(b => b.OwnerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Column -> Board
        modelBuilder.Entity<Column>(entity =>
        {
            entity.HasOne(c => c.Board)
                  .WithMany(b => b.Columns)
                  .HasForeignKey(c => c.BoardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TaskCard -> Column
        modelBuilder.Entity<TaskCard>(entity =>
        {
            entity.HasOne(t => t.Column)
                  .WithMany(c => c.TaskCards)
                  .HasForeignKey(t => t.ColumnId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TaskActivity -> TaskCard
        modelBuilder.Entity<TaskActivity>(entity =>
        {
            entity.HasOne(a => a.TaskCard)
                  .WithMany() // TaskCard doesn't need explicit list of activities for now, can query by ID
                  .HasForeignKey(a => a.TaskCardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.User)
                  .WithMany()
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // BoardMember (User <-> Board many-to-many)
        modelBuilder.Entity<BoardMember>(entity =>
        {
            entity.HasOne(bm => bm.User)
                  .WithMany(u => u.MemberBoards)
                  .HasForeignKey(bm => bm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(bm => bm.Board)
                  .WithMany(b => b.Members)
                  .HasForeignKey(bm => bm.BoardId)
                  .OnDelete(DeleteBehavior.NoAction); // Avoid multiple cascade paths

            entity.HasIndex(bm => new { bm.UserId, bm.BoardId }).IsUnique();
        });

        // Workspace -> User (Owner)
        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.HasOne(w => w.Owner)
                  .WithMany() // Assuming User doesn't need explicit list of OwnedWorkspaces navigation
                  .HasForeignKey(w => w.OwnerId)
                  .OnDelete(DeleteBehavior.Restrict); // Prevent deleting user if they own workspace? Or Cascade? Usually Cascade.
        });

        // WorkspaceMember
        modelBuilder.Entity<WorkspaceMember>(entity =>
        {
            entity.HasOne(wm => wm.User)
                  .WithMany()
                  .HasForeignKey(wm => wm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(wm => wm.Workspace)
                  .WithMany(w => w.Members)
                  .HasForeignKey(wm => wm.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(wm => new { wm.UserId, wm.WorkspaceId }).IsUnique();
        });

        // Board -> Workspace
        modelBuilder.Entity<Board>(entity =>
        {
            entity.HasOne(b => b.Workspace)
                  .WithMany(w => w.Boards)
                  .HasForeignKey(b => b.WorkspaceId)
                  .OnDelete(DeleteBehavior.SetNull); 
        });

        // TimeLog -> TaskCard and User
        modelBuilder.Entity<TimeLog>(entity =>
        {
            entity.HasOne(tl => tl.TaskCard)
                  .WithMany(tc => tc.TimeLogs)
                  .HasForeignKey(tl => tl.TaskCardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tl => tl.User)
                  .WithMany()
                  .HasForeignKey(tl => tl.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
