namespace Kairo.Api.Models;

public class Workspace
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Token de color de la paleta (ej. "indigo"), no un hex, para que el tema lo resuelva el front.</summary>
    public string Color { get; set; } = "indigo";

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    public ICollection<Board> Boards { get; set; } = new List<Board>();
    public ICollection<WorkspaceInvitation> Invitations { get; set; } = new List<WorkspaceInvitation>();
}
