using System.Text.Json.Serialization;

namespace Backend.Models;

public class Label
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6"; // Default blue
    
    public int BoardId { get; set; }
    [JsonIgnore]
    public Board Board { get; set; } = null!;

    public ICollection<TaskLabel> TaskLabels { get; set; } = new List<TaskLabel>();
}
