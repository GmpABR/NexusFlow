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
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<TaskAssignee> TaskAssignees { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<TaskLabel> TaskLabels { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<TaskActivityReaction> TaskActivityReactions { get; set; }
    public DbSet<BoardInvite> BoardInvites { get; set; }
    public DbSet<WorkspaceInvite> WorkspaceInvites { get; set; }
    public DbSet<BoardAutomation> BoardAutomations { get; set; }

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
            entity.HasIndex(a => a.TaskCardId); // Optimization

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

        // BoardAutomation -> Board
        modelBuilder.Entity<BoardAutomation>(entity =>
        {
            entity.HasOne(a => a.Board)
                  .WithMany(b => b.Automations)
                  .HasForeignKey(a => a.BoardId)
                  .OnDelete(DeleteBehavior.Cascade);
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

        // Attachment -> TaskCard and UploadedBy
        modelBuilder.Entity<Attachment>(entity =>
        {
            entity.HasOne(a => a.TaskCard)
                  .WithMany(tc => tc.Attachments)
                  .HasForeignKey(a => a.TaskCardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.UploadedBy)
                  .WithMany()
                  .HasForeignKey(a => a.UploadedById)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // TaskAssignee (TaskCard <-> User many-to-many)
        modelBuilder.Entity<TaskAssignee>(entity =>
        {
            entity.HasKey(ta => new { ta.TaskCardId, ta.UserId });

            entity.HasOne(ta => ta.TaskCard)
                  .WithMany(tc => tc.Assignees)
                  .HasForeignKey(ta => ta.TaskCardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ta => ta.User)
                  .WithMany()
                  .HasForeignKey(ta => ta.UserId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // Label -> Board
        modelBuilder.Entity<Label>(entity =>
        {
            entity.HasOne(l => l.Board)
                  .WithMany(b => b.Labels)
                  .HasForeignKey(l => l.BoardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TaskLabel (TaskCard <-> Label many-to-many)
        modelBuilder.Entity<TaskLabel>(entity =>
        {
            entity.HasKey(tl => new { tl.TaskCardId, tl.LabelId });

            entity.HasOne(tl => tl.TaskCard)
                  .WithMany(tc => tc.Labels)
                  .HasForeignKey(tl => tl.TaskCardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tl => tl.Label)
                  .WithMany(l => l.TaskLabels)
                  .HasForeignKey(tl => tl.LabelId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Notification -> User
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasOne(n => n.User)
                  .WithMany() // User doesn't necessarily need a collection of notifications in the model
                  .HasForeignKey(n => n.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TaskActivityReaction
        modelBuilder.Entity<TaskActivityReaction>(entity =>
        {
            entity.HasIndex(r => r.TaskActivityId); // Optimization

            entity.HasOne(r => r.TaskActivity)
                  .WithMany(a => a.Reactions)
                  .HasForeignKey(r => r.TaskActivityId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // BoardInvite
        modelBuilder.Entity<BoardInvite>(entity =>
        {
            entity.HasIndex(i => i.Token).IsUnique();

            entity.HasOne(i => i.Board)
                  .WithMany()
                  .HasForeignKey(i => i.BoardId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Creator)
                  .WithMany()
                  .HasForeignKey(i => i.CreatorId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // WorkspaceInvite
        modelBuilder.Entity<WorkspaceInvite>(entity =>
        {
            entity.HasIndex(i => i.Token).IsUnique();

            entity.HasOne(i => i.Workspace)
                  .WithMany()
                  .HasForeignKey(i => i.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Creator)
                  .WithMany()
                  .HasForeignKey(i => i.CreatorId)
                  .OnDelete(DeleteBehavior.NoAction);
        });
    }
}

