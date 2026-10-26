namespace Kairo.Api.Models;

public class Label
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Token de la paleta de etiquetas (ej. "emerald", "rose").</summary>
    public string Color { get; set; } = "slate";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CardLabel> CardLabels { get; set; } = new List<CardLabel>();
}
