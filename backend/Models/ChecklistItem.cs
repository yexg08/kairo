namespace Kairo.Api.Models;

public class ChecklistItem : IPositioned
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid CardId { get; set; }
    public Card? Card { get; set; }

    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }

    public double Position { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
