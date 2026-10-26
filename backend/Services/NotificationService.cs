using Kairo.Api.Data;
using Kairo.Api.DTOs.Notifications;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Services;

public class NotificationService(ApplicationDbContext db, IBoardBroadcaster broadcaster) : INotificationService
{
    public Task SendAsync(string recipientUserId, NotificationDraft draft, CancellationToken ct = default)
        => SendManyAsync([recipientUserId], draft, ct);

    public async Task SendManyAsync(
        IEnumerable<string> recipientUserIds,
        NotificationDraft draft,
        CancellationToken ct = default)
    {
        var recipients = recipientUserIds
            .Where(id => !string.IsNullOrEmpty(id) && id != draft.ActorUserId)
            .Distinct()
            .ToList();

        if (recipients.Count == 0)
        {
            return;
        }

        var notifications = recipients
            .Select(recipientId => new Notification
            {
                UserId = recipientId,
                ActorUserId = draft.ActorUserId,
                Type = draft.Type,
                WorkspaceId = draft.WorkspaceId,
                BoardId = draft.BoardId,
                CardId = draft.CardId,
                InvitationId = draft.InvitationId,
                WorkspaceName = draft.WorkspaceName,
                BoardName = draft.BoardName,
                CardTitle = draft.CardTitle,
                Detail = draft.Detail
            })
            .ToList();

        db.Notifications.AddRange(notifications);
        await db.SaveChangesAsync(ct);

        var actor = draft.ActorUserId is null
            ? null
            : await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == draft.ActorUserId, ct);

        foreach (var notification in notifications)
        {
            var dto = new NotificationDto
            {
                Id = notification.Id,
                Type = notification.Type,
                Actor = actor?.ToSummary(),
                WorkspaceId = notification.WorkspaceId,
                BoardId = notification.BoardId,
                CardId = notification.CardId,
                InvitationId = notification.InvitationId,
                WorkspaceName = notification.WorkspaceName,
                BoardName = notification.BoardName,
                CardTitle = notification.CardTitle,
                Detail = notification.Detail,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            };

            await broadcaster.User(notification.UserId).NotificationReceived(dto);
        }
    }
}
