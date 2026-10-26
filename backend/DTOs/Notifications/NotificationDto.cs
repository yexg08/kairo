using Kairo.Api.DTOs.Common;
using Kairo.Api.Models;

namespace Kairo.Api.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public UserSummaryDto? Actor { get; set; }

    public Guid? WorkspaceId { get; set; }
    public Guid? BoardId { get; set; }
    public Guid? CardId { get; set; }
    public Guid? InvitationId { get; set; }

    public string? WorkspaceName { get; set; }
    public string? BoardName { get; set; }
    public string? CardTitle { get; set; }
    public string? Detail { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
