namespace Kairo.Api.Models;

/// <summary>
/// Última vez que un usuario abrió un tablero. Alimenta la sección
/// "vistos recientemente" del dashboard.
/// </summary>
public class BoardVisit
{
    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public DateTime VisitedAt { get; set; } = DateTime.UtcNow;
}
