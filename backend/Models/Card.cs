namespace Kairo.Api.Models;

public class Card : IPositioned
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid BoardListId { get; set; }
    public BoardList? BoardList { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Orden dentro de la lista. Ver la nota de <see cref="BoardList.Position"/>.</summary>
    public double Position { get; set; }

    public DateTime? DueDate { get; set; }

    /// <summary>Marca de "vencimiento cumplido", independiente de en qué lista esté la tarjeta.</summary>
    public bool IsCompleted { get; set; }

    /// <summary>Franja de color opcional en la parte superior de la tarjeta.</summary>
    public string? CoverColor { get; set; }

    public bool IsArchived { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CardLabel> CardLabels { get; set; } = new List<CardLabel>();
    public ICollection<CardAssignee> Assignees { get; set; } = new List<CardAssignee>();
    public ICollection<ChecklistItem> ChecklistItems { get; set; } = new List<ChecklistItem>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
