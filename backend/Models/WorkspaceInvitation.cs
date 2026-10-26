namespace Kairo.Api.Models;

public enum InvitationStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Revoked = 3
}

/// <summary>
/// Invitación a un workspace. Como el envío de correos queda para fase 2, la invitación
/// se entrega dentro de la app: le llega al invitado por la campana de notificaciones
/// y solo se convierte en <see cref="WorkspaceMember"/> cuando la acepta.
/// </summary>
public class WorkspaceInvitation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public string InvitedUserId { get; set; } = string.Empty;
    public ApplicationUser? InvitedUser { get; set; }

    public string InvitedByUserId { get; set; } = string.Empty;
    public ApplicationUser? InvitedBy { get; set; }

    public WorkspaceRole Role { get; set; } = WorkspaceRole.Member;
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}
