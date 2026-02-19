using System.Text.Json.Serialization;

namespace Backend.Models;

public class Subtask
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;

    // Foreign Key
    public int TaskCardId { get; set; }
    [JsonIgnore]
    public TaskCard TaskCard { get; set; } = null!;
}
