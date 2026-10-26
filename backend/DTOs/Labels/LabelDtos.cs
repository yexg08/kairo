using System.ComponentModel.DataAnnotations;

namespace Kairo.Api.DTOs.Labels;

public class LabelDto
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "slate";
}

public class CreateLabelRequest
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Color { get; set; } = "slate";
}

public class UpdateLabelRequest
{
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Color { get; set; } = "slate";
}
