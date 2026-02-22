namespace Backend.DTOs;

public class LabelDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int BoardId { get; set; }
}

public class CreateLabelDto
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6";
}

public class UpdateLabelDto
{
    public string? Name { get; set; }
    public string? Color { get; set; }
}
