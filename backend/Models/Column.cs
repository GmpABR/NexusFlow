namespace Backend.Models;

public class Column
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }

    // Foreign Key
    public int BoardId { get; set; }
    public Board Board { get; set; } = null!;

    // Navigation
    public ICollection<TaskCard> TaskCards { get; set; } = new List<TaskCard>();
}
