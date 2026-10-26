using Kairo.Api.Data;
using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api/workspaces")]
public class WorkspacesController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    INotificationService notifications) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkspaceDto>>> GetMine()
    {
        var workspaces = await db.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.UserId == UserId)
            .OrderBy(m => m.Workspace!.Name)
            .Select(m => new WorkspaceDto
            {
                Id = m.WorkspaceId,
                Name = m.Workspace!.Name,
                Description = m.Workspace.Description,
                Color = m.Workspace.Color,
                MyRole = m.Role,
                MemberCount = m.Workspace.Members.Count,
                BoardCount = m.Workspace.Boards.Count(b => !b.IsArchived),
                CreatedAt = m.Workspace.CreatedAt
            })
            .ToListAsync(HttpContext.RequestAborted);

        return workspaces;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkspaceDto>> GetById(Guid id)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var workspace = await db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == id)
            .Select(w => new WorkspaceDto
            {
                Id = w.Id,
                Name = w.Name,
                Description = w.Description,
                Color = w.Color,
                MyRole = role.Value,
                MemberCount = w.Members.Count,
                BoardCount = w.Boards.Count(b => !b.IsArchived),
                CreatedAt = w.CreatedAt
            })
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        return workspace is null ? NotFoundMessage("El espacio no existe.") : workspace;
    }

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceRequest request)
    {
        var workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Color = request.Color,
            CreatedByUserId = UserId
        };

        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = UserId,
            Role = WorkspaceRole.Owner
        });

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return CreatedAtAction(nameof(GetById), new { id = workspace.Id }, new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Description = workspace.Description,
            Color = workspace.Color,
            MyRole = WorkspaceRole.Owner,
            MemberCount = 1,
            BoardCount = 0,
            CreatedAt = workspace.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkspaceDto>> Update(Guid id, UpdateWorkspaceRequest request)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        if (role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden editar el espacio.");
        }

        var workspace = await db.Workspaces.FirstOrDefaultAsync(w => w.Id == id, HttpContext.RequestAborted);
        if (workspace is null)
        {
            return NotFoundMessage("El espacio no existe.");
        }

        workspace.Name = request.Name.Trim();
        workspace.Description = request.Description?.Trim();
        workspace.Color = request.Color;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return await GetById(id);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        if (role != WorkspaceRole.Owner)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo el Owner puede eliminar el espacio.");
        }

        var workspace = await db.Workspaces.FirstOrDefaultAsync(w => w.Id == id, HttpContext.RequestAborted);
        if (workspace is null)
        {
            return NotFoundMessage("El espacio no existe.");
        }

        db.Workspaces.Remove(workspace);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpGet("{id:guid}/boards")]
    public async Task<ActionResult<List<BoardSummaryDto>>> GetBoards(Guid id, [FromQuery] bool includeArchived = false)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var boards = await db.Boards
            .AsNoTracking()
            .Where(b => b.WorkspaceId == id && (includeArchived || !b.IsArchived))
            .OrderByDescending(b => b.UpdatedAt)
            .Select(b => new BoardSummaryDto
            {
                Id = b.Id,
                WorkspaceId = b.WorkspaceId,
                WorkspaceName = b.Workspace!.Name,
                Name = b.Name,
                Description = b.Description,
                Background = b.Background,
                IsArchived = b.IsArchived,
                ListCount = b.Lists.Count(l => !l.IsArchived),
                CardCount = b.Lists.Where(l => !l.IsArchived).SelectMany(l => l.Cards).Count(c => !c.IsArchived),
                UpdatedAt = b.UpdatedAt,
                LastVisitedAt = b.Visits
                    .Where(v => v.UserId == UserId)
                    .Select(v => (DateTime?)v.VisitedAt)
                    .FirstOrDefault()
            })
            .ToListAsync(HttpContext.RequestAborted);

        return boards;
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<WorkspaceMemberDto>>> GetMembers(Guid id)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var members = await db.WorkspaceMembers
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.WorkspaceId == id)
            .OrderBy(m => m.Role)
            .ThenBy(m => m.User!.DisplayName)
            .ToListAsync(HttpContext.RequestAborted);

        return members.Select(m => m.ToDto()).ToList();
    }

    [HttpGet("{id:guid}/invitations")]
    public async Task<ActionResult<List<InvitationDto>>> GetPendingInvitations(Guid id)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var invitations = await db.WorkspaceInvitations
            .AsNoTracking()
            .Include(i => i.Workspace)
            .Include(i => i.InvitedBy)
            .Include(i => i.InvitedUser)
            .Where(i => i.WorkspaceId == id && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(HttpContext.RequestAborted);

        return invitations.Select(i => i.ToDto()).ToList();
    }

    [HttpPost("{id:guid}/invitations")]
    public async Task<ActionResult<InvitationDto>> Invite(Guid id, InviteMemberRequest request)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        if (role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden invitar gente.");
        }

        if (request.Role == WorkspaceRole.Owner)
        {
            return Fail(StatusCodes.Status400BadRequest, "El rol de Owner no se puede asignar por invitación.");
        }

        var identifier = request.EmailOrUsername.Trim();
        var invited = await db.Users
            .FirstOrDefaultAsync(
                u => u.Email == identifier || u.UserName == identifier,
                HttpContext.RequestAborted);

        if (invited is null)
        {
            return NotFoundMessage("No hay ninguna cuenta con ese correo o usuario.");
        }

        if (invited.Id == UserId)
        {
            return Fail(StatusCodes.Status400BadRequest, "Ya formas parte de este espacio.");
        }

        var alreadyMember = await db.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == id && m.UserId == invited.Id, HttpContext.RequestAborted);

        if (alreadyMember)
        {
            return Conflict(new { message = $"{invited.DisplayName} ya es miembro de este espacio." });
        }

        var alreadyInvited = await db.WorkspaceInvitations
            .AnyAsync(
                i => i.WorkspaceId == id && i.InvitedUserId == invited.Id && i.Status == InvitationStatus.Pending,
                HttpContext.RequestAborted);

        if (alreadyInvited)
        {
            return Conflict(new { message = $"{invited.DisplayName} ya tiene una invitación pendiente." });
        }

        var workspace = await db.Workspaces
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id, HttpContext.RequestAborted);

        if (workspace is null)
        {
            return NotFoundMessage("El espacio no existe.");
        }

        var invitation = new WorkspaceInvitation
        {
            WorkspaceId = id,
            InvitedUserId = invited.Id,
            InvitedByUserId = UserId,
            Role = request.Role
        };

        db.WorkspaceInvitations.Add(invitation);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await notifications.SendAsync(invited.Id, new NotificationDraft
        {
            Type = NotificationType.WorkspaceInvitation,
            ActorUserId = UserId,
            WorkspaceId = id,
            WorkspaceName = workspace.Name,
            InvitationId = invitation.Id,
            Detail = request.Role.ToString()
        }, HttpContext.RequestAborted);

        return new InvitationDto
        {
            Id = invitation.Id,
            WorkspaceId = id,
            WorkspaceName = workspace.Name,
            WorkspaceColor = workspace.Color,
            InvitedByName = User.GetDisplayName() ?? string.Empty,
            InvitedUserName = invited.DisplayName,
            InvitedUserEmail = invited.Email,
            InvitedUserAvatarColor = invited.AvatarColor,
            Role = invitation.Role,
            Status = invitation.Status,
            CreatedAt = invitation.CreatedAt
        };
    }

    [HttpDelete("{id:guid}/invitations/{invitationId:guid}")]
    public async Task<IActionResult> RevokeInvitation(Guid id, Guid invitationId)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null || role == WorkspaceRole.Member)
        {
            return NoAccess();
        }

        var invitation = await db.WorkspaceInvitations
            .FirstOrDefaultAsync(
                i => i.Id == invitationId && i.WorkspaceId == id,
                HttpContext.RequestAborted);

        if (invitation is null)
        {
            return NotFoundMessage("La invitación no existe.");
        }

        invitation.Status = InvitationStatus.Revoked;
        invitation.RespondedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpPut("{id:guid}/members/{memberUserId}/role")]
    public async Task<IActionResult> UpdateMemberRole(Guid id, string memberUserId, UpdateMemberRoleRequest request)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        if (role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden cambiar roles.");
        }

        if (request.Role == WorkspaceRole.Owner)
        {
            return Fail(StatusCodes.Status400BadRequest, "El espacio solo puede tener un Owner.");
        }

        var member = await db.WorkspaceMembers
            .Include(m => m.Workspace)
            .FirstOrDefaultAsync(
                m => m.WorkspaceId == id && m.UserId == memberUserId,
                HttpContext.RequestAborted);

        if (member is null)
        {
            return NotFoundMessage("Esa persona no es miembro del espacio.");
        }

        if (member.Role == WorkspaceRole.Owner)
        {
            return Fail(StatusCodes.Status400BadRequest, "No se puede cambiar el rol del Owner.");
        }

        member.Role = request.Role;
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await notifications.SendAsync(memberUserId, new NotificationDraft
        {
            Type = NotificationType.RoleChanged,
            ActorUserId = UserId,
            WorkspaceId = id,
            WorkspaceName = member.Workspace?.Name,
            Detail = request.Role.ToString()
        }, HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpDelete("{id:guid}/members/{memberUserId}")]
    public async Task<IActionResult> RemoveMember(Guid id, string memberUserId)
    {
        var role = await access.GetRoleAsync(UserId, id, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var isSelf = memberUserId == UserId;

        if (!isSelf && role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden quitar gente.");
        }

        var member = await db.WorkspaceMembers
            .Include(m => m.Workspace)
            .FirstOrDefaultAsync(
                m => m.WorkspaceId == id && m.UserId == memberUserId,
                HttpContext.RequestAborted);

        if (member is null)
        {
            return NotFoundMessage("Esa persona no es miembro del espacio.");
        }

        if (member.Role == WorkspaceRole.Owner)
        {
            return Fail(
                StatusCodes.Status400BadRequest,
                isSelf
                    ? "Eres el Owner: para salir tendrías que eliminar el espacio."
                    : "No se puede quitar al Owner del espacio.");
        }

        // Al salir del workspace se pierde el acceso a sus tableros, así que las tarjetas
        // asignadas a esa persona dejarían de tener sentido: se sueltan aquí.
        var assignments = await db.CardAssignees
            .Where(a => a.UserId == memberUserId && a.Card!.BoardList!.Board!.WorkspaceId == id)
            .ToListAsync(HttpContext.RequestAborted);

        db.CardAssignees.RemoveRange(assignments);
        db.WorkspaceMembers.Remove(member);

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        if (!isSelf)
        {
            await notifications.SendAsync(memberUserId, new NotificationDraft
            {
                Type = NotificationType.RemovedFromWorkspace,
                ActorUserId = UserId,
                WorkspaceId = id,
                WorkspaceName = member.Workspace?.Name
            }, HttpContext.RequestAborted);
        }

        return NoContent();
    }
}
