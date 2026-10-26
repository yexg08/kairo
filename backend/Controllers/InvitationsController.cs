using Kairo.Api.Data;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

/// <summary>Invitaciones vistas desde el lado de quien las recibe.</summary>
[Route("api/invitations")]
public class InvitationsController(
    ApplicationDbContext db,
    INotificationService notifications) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<InvitationDto>>> GetMine()
    {
        var invitations = await db.WorkspaceInvitations
            .AsNoTracking()
            .Include(i => i.Workspace)
            .Include(i => i.InvitedBy)
            .Include(i => i.InvitedUser)
            .Where(i => i.InvitedUserId == UserId && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(HttpContext.RequestAborted);

        return invitations.Select(i => i.ToDto()).ToList();
    }

    [HttpPost("{id:guid}/accept")]
    public async Task<ActionResult<WorkspaceDto>> Accept(Guid id)
    {
        var invitation = await db.WorkspaceInvitations
            .Include(i => i.Workspace)
            .FirstOrDefaultAsync(i => i.Id == id, HttpContext.RequestAborted);

        if (invitation is null || invitation.InvitedUserId != UserId)
        {
            return NotFoundMessage("La invitación no existe.");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            return Fail(StatusCodes.Status409Conflict, "Esa invitación ya no está disponible.");
        }

        invitation.Status = InvitationStatus.Accepted;
        invitation.RespondedAt = DateTime.UtcNow;

        var alreadyMember = await db.WorkspaceMembers
            .AnyAsync(
                m => m.WorkspaceId == invitation.WorkspaceId && m.UserId == UserId,
                HttpContext.RequestAborted);

        if (!alreadyMember)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = invitation.WorkspaceId,
                UserId = UserId,
                Role = invitation.Role
            });
        }

        // La notificación que trajo la invitación deja de tener sentido una vez respondida.
        await MarkInvitationNotificationsReadAsync(id);

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await notifications.SendAsync(invitation.InvitedByUserId, new NotificationDraft
        {
            Type = NotificationType.InvitationAccepted,
            ActorUserId = UserId,
            WorkspaceId = invitation.WorkspaceId,
            WorkspaceName = invitation.Workspace?.Name
        }, HttpContext.RequestAborted);

        var workspace = await db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == invitation.WorkspaceId)
            .Select(w => new WorkspaceDto
            {
                Id = w.Id,
                Name = w.Name,
                Description = w.Description,
                Color = w.Color,
                MyRole = invitation.Role,
                MemberCount = w.Members.Count,
                BoardCount = w.Boards.Count(b => !b.IsArchived),
                CreatedAt = w.CreatedAt
            })
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        return workspace is null ? NotFoundMessage("El espacio ya no existe.") : workspace;
    }

    [HttpPost("{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id)
    {
        var invitation = await db.WorkspaceInvitations
            .FirstOrDefaultAsync(i => i.Id == id, HttpContext.RequestAborted);

        if (invitation is null || invitation.InvitedUserId != UserId)
        {
            return NotFoundMessage("La invitación no existe.");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            return Fail(StatusCodes.Status409Conflict, "Esa invitación ya no está disponible.");
        }

        invitation.Status = InvitationStatus.Declined;
        invitation.RespondedAt = DateTime.UtcNow;

        await MarkInvitationNotificationsReadAsync(id);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    private async Task MarkInvitationNotificationsReadAsync(Guid invitationId)
    {
        var related = await db.Notifications
            .Where(n => n.InvitationId == invitationId && n.UserId == UserId && !n.IsRead)
            .ToListAsync(HttpContext.RequestAborted);

        foreach (var notification in related)
        {
            notification.IsRead = true;
        }
    }
}
