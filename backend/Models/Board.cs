namespace Kairo.Api.Models;

public class Board
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>
    /// Token del degradado de fondo (ej. "aurora", "midnight"). El front lo traduce a
    /// clases de Tailwind, así que cambiar la paleta no obliga a migrar la base.
    /// </summary>
    public string Background { get; set; } = "aurora";

    public bool IsArchived { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BoardList> Lists { get; set; } = new List<BoardList>();
    public ICollection<Label> Labels { get; set; } = new List<Label>();
    public ICollection<ActivityLogEntry> Activity { get; set; } = new List<ActivityLogEntry>();
    public ICollection<BoardVisit> Visits { get; set; } = new List<BoardVisit>();
}
