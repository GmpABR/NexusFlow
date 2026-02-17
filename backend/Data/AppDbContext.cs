using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<Column> Columns => Set<Column>();
    public DbSet<TaskCard> TaskCards => Set<TaskCard>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();

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
                  .OnDelete(DeleteBehavior.SetNull); // If workspace deleted, keep boards? Or Cascade? Trello cascades. Let's SetNull for safety first, or Cascade.
                  // Actually, let's Cascade. If workspace is gone, boards should be gone.
                  // But wait, if I delete workspace, I want boards to be deleted.
                  // .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
