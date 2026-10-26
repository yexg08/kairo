namespace Kairo.Api.Models;

public class CardAssignee
{
    public Guid CardId { get; set; }
    public Card? Card { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
