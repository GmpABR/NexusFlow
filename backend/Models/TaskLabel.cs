using System.Text.Json.Serialization;

namespace Backend.Models;

public class TaskLabel
{
    public int TaskCardId { get; set; }
    [JsonIgnore]
    public TaskCard TaskCard { get; set; } = null!;

    public int LabelId { get; set; }
    public Label Label { get; set; } = null!;
}
