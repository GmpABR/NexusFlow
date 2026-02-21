namespace Backend.Models;

public class TaskAssignee
{
    public int TaskCardId { get; set; }
    public TaskCard TaskCard { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
