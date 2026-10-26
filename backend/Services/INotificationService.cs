using Kairo.Api.Models;

namespace Kairo.Api.Services;

/// <summary>Contenido de una notificación, sin destinatario: el mismo aviso suele ir a varios.</summary>
public class NotificationDraft
{
    public NotificationType Type { get; init; }
    public string? ActorUserId { get; init; }

    public Guid? WorkspaceId { get; init; }
    public Guid? BoardId { get; init; }
    public Guid? CardId { get; init; }
    public Guid? InvitationId { get; init; }

    public string? WorkspaceName { get; init; }
    public string? BoardName { get; init; }
    public string? CardTitle { get; init; }
    public string? Detail { get; init; }
}

public interface INotificationService
{
    Task SendAsync(string recipientUserId, NotificationDraft draft, CancellationToken ct = default);

    /// <summary>
    /// Envía a varios destinatarios de una vez. Nunca le notifica a quien provocó el evento:
    /// a nadie le sirve un aviso de su propia acción.
    /// </summary>
    Task SendManyAsync(IEnumerable<string> recipientUserIds, NotificationDraft draft, CancellationToken ct = default);
}
