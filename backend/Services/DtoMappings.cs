using Kairo.Api.DTOs.Activity;
using Kairo.Api.DTOs.Cards;
using Kairo.Api.DTOs.Checklist;
using Kairo.Api.DTOs.Comments;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.DTOs.Lists;
using Kairo.Api.DTOs.Notifications;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;

namespace Kairo.Api.Services;

/// <summary>
/// Entidad -> DTO. Cada método asume que el llamador ya hizo los Include que necesita;
/// los contadores de comentarios se pasan aparte porque cargar todos los comentarios de
/// un tablero solo para contarlos sería absurdo.
/// </summary>
public static class DtoMappings
{
    public static UserSummaryDto ToSummary(this ApplicationUser user) => new()
    {
        Id = user.Id,
        DisplayName = user.DisplayName,
        Email = user.Email,
        AvatarColor = user.AvatarColor
    };

    public static string BuildInitials(string displayName)
    {
        var parts = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        return parts.Length switch
        {
            0 => "?",
            1 => parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant(),
            _ => string.Concat(parts[0][0], parts[^1][0]).ToUpperInvariant()
        };
    }

    public static WorkspaceMemberDto ToDto(this WorkspaceMember member) => new()
    {
        UserId = member.UserId,
        DisplayName = member.User?.DisplayName ?? string.Empty,
        Email = member.User?.Email,
        AvatarColor = member.User?.AvatarColor ?? "indigo",
        Role = member.Role,
        JoinedAt = member.JoinedAt
    };

    public static LabelDto ToDto(this Label label) => new()
    {
        Id = label.Id,
        BoardId = label.BoardId,
        Name = label.Name,
        Color = label.Color
    };

    public static ChecklistItemDto ToDto(this ChecklistItem item) => new()
    {
        Id = item.Id,
        CardId = item.CardId,
        Text = item.Text,
        IsCompleted = item.IsCompleted,
        Position = item.Position
    };

    public static CommentDto ToDto(this Comment comment) => new()
    {
        Id = comment.Id,
        CardId = comment.CardId,
        Text = comment.Text,
        CreatedAt = comment.CreatedAt,
        UpdatedAt = comment.UpdatedAt,
        Author = comment.User?.ToSummary() ?? new UserSummaryDto()
    };

    public static CardDto ToDto(this Card card, int commentCount = 0) => new()
    {
        Id = card.Id,
        BoardListId = card.BoardListId,
        Title = card.Title,
        HasDescription = !string.IsNullOrWhiteSpace(card.Description),
        Position = card.Position,
        DueDate = card.DueDate,
        IsCompleted = card.IsCompleted,
        CoverColor = card.CoverColor,
        IsArchived = card.IsArchived,
        Labels = card.CardLabels
            .Where(cl => cl.Label is not null)
            .Select(cl => cl.Label!.ToDto())
            .OrderBy(l => l.Name)
            .ToList(),
        Assignees = card.Assignees
            .Where(a => a.User is not null)
            .Select(a => a.User!.ToSummary())
            .OrderBy(a => a.DisplayName)
            .ToList(),
        ChecklistTotal = card.ChecklistItems.Count,
        ChecklistDone = card.ChecklistItems.Count(i => i.IsCompleted),
        CommentCount = commentCount
    };

    public static CardDetailDto ToDetailDto(this Card card, Guid boardId, string listName)
    {
        var summary = card.ToDto(card.Comments.Count);

        return new CardDetailDto
        {
            Id = summary.Id,
            BoardListId = summary.BoardListId,
            Title = summary.Title,
            HasDescription = summary.HasDescription,
            Position = summary.Position,
            DueDate = summary.DueDate,
            IsCompleted = summary.IsCompleted,
            CoverColor = summary.CoverColor,
            IsArchived = summary.IsArchived,
            Labels = summary.Labels,
            Assignees = summary.Assignees,
            ChecklistTotal = summary.ChecklistTotal,
            ChecklistDone = summary.ChecklistDone,
            CommentCount = summary.CommentCount,

            Description = card.Description,
            CreatedBy = card.CreatedBy?.ToSummary(),
            CreatedAt = card.CreatedAt,
            UpdatedAt = card.UpdatedAt,
            BoardId = boardId,
            ListName = listName,
            ChecklistItems = card.ChecklistItems
                .OrderBy(i => i.Position)
                .Select(i => i.ToDto())
                .ToList(),
            Comments = card.Comments
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => c.ToDto())
                .ToList()
        };
    }

    public static BoardListDto ToDto(this BoardList list, IReadOnlyDictionary<Guid, int>? commentCounts = null) => new()
    {
        Id = list.Id,
        BoardId = list.BoardId,
        Name = list.Name,
        Position = list.Position,
        IsArchived = list.IsArchived,
        Cards = list.Cards
            .Where(c => !c.IsArchived)
            .OrderBy(c => c.Position)
            .Select(c => c.ToDto(commentCounts?.GetValueOrDefault(c.Id) ?? 0))
            .ToList()
    };

    public static ActivityDto ToDto(this ActivityLogEntry entry) => new()
    {
        Id = entry.Id,
        BoardId = entry.BoardId,
        Type = entry.Type,
        Actor = entry.Actor?.ToSummary() ?? new UserSummaryDto(),
        CardId = entry.CardId,
        CardTitle = entry.CardTitle,
        FromListName = entry.FromListName,
        ToListName = entry.ToListName,
        Detail = entry.Detail,
        CreatedAt = entry.CreatedAt
    };

    public static NotificationDto ToDto(this Notification notification) => new()
    {
        Id = notification.Id,
        Type = notification.Type,
        Actor = notification.Actor?.ToSummary(),
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

    public static InvitationDto ToDto(this WorkspaceInvitation invitation) => new()
    {
        Id = invitation.Id,
        WorkspaceId = invitation.WorkspaceId,
        WorkspaceName = invitation.Workspace?.Name ?? string.Empty,
        WorkspaceColor = invitation.Workspace?.Color ?? "indigo",
        InvitedByName = invitation.InvitedBy?.DisplayName ?? string.Empty,
        InvitedUserName = invitation.InvitedUser?.DisplayName ?? string.Empty,
        InvitedUserEmail = invitation.InvitedUser?.Email,
        InvitedUserAvatarColor = invitation.InvitedUser?.AvatarColor ?? "indigo",
        Role = invitation.Role,
        Status = invitation.Status,
        CreatedAt = invitation.CreatedAt
    };
}
