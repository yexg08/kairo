using System.ComponentModel.DataAnnotations;

namespace Kairo.Api.DTOs.Checklist;

public class ChecklistItemDto
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public double Position { get; set; }
}

public class CreateChecklistItemRequest
{
    [Required, MaxLength(300)]
    public string Text { get; set; } = string.Empty;
}

public class UpdateChecklistItemRequest
{
    [Required, MaxLength(300)]
    public string Text { get; set; } = string.Empty;

    public bool IsCompleted { get; set; }
}
