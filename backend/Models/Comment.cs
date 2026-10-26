namespace Kairo.Api.Models;

public class Comment
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid CardId { get; set; }
    public Card? Card { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public string Text { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
