namespace Kairo.Api.Models;

public enum NotificationType
{
    CardAssigned = 0,
    CardUnassigned = 1,
    CommentOnCard = 2,
    DueDateChanged = 3,
    WorkspaceInvitation = 10,
    InvitationAccepted = 11,
    RoleChanged = 12,
    RemovedFromWorkspace = 13
}

public class Notification
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>Destinatario.</summary>
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    /// <summary>Quien provocó la notificación. Null si la generó el sistema.</summary>
    public string? ActorUserId { get; set; }
    public ApplicationUser? Actor { get; set; }

    public NotificationType Type { get; set; }

    public Guid? WorkspaceId { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? CardId { get; set; }

    /// <summary>Invitación asociada, para poder aceptar/rechazar desde la campana.</summary>
    public Guid? InvitationId { get; set; }

    // Copias del contexto en el momento del evento, por lo mismo que en ActivityLogEntry.
    public string? WorkspaceName { get; set; }
    public string? BoardName { get; set; }
    public string? CardTitle { get; set; }
    public string? Detail { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
