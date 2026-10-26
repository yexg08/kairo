using Kairo.Api.Data;
using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Dashboard;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api/dashboard")]
public class DashboardController(ApplicationDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        var userId = UserId;
        var ct = HttpContext.RequestAborted;
        var now = DateTime.UtcNow;

        var workspaces = await db.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
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
            .ToListAsync(ct);

        var recentBoards = await db.BoardVisits
            .AsNoTracking()
            .Where(v => v.UserId == userId && !v.Board!.IsArchived)
            .OrderByDescending(v => v.VisitedAt)
            .Take(6)
            .Select(v => new BoardSummaryDto
            {
                Id = v.BoardId,
                WorkspaceId = v.Board!.WorkspaceId,
                WorkspaceName = v.Board.Workspace!.Name,
                Name = v.Board.Name,
                Description = v.Board.Description,
                Background = v.Board.Background,
                IsArchived = v.Board.IsArchived,
                ListCount = v.Board.Lists.Count(l => !l.IsArchived),
                CardCount = v.Board.Lists.Where(l => !l.IsArchived).SelectMany(l => l.Cards).Count(c => !c.IsArchived),
                UpdatedAt = v.Board.UpdatedAt,
                LastVisitedAt = v.VisitedAt
            })
            .ToListAsync(ct);

        var myCards = await db.CardAssignees
            .AsNoTracking()
            .Where(a => a.UserId == userId
                && !a.Card!.IsArchived
                && !a.Card.IsCompleted
                && !a.Card.BoardList!.IsArchived
                && !a.Card.BoardList.Board!.IsArchived)
            // Primero lo que tiene fecha (y antes lo que vence antes); lo que no la tiene, al final.
            .OrderBy(a => a.Card!.DueDate == null)
            .ThenBy(a => a.Card!.DueDate)
            .Take(12)
            .Select(a => new AssignedCardDto
            {
                Id = a.CardId,
                Title = a.Card!.Title,
                DueDate = a.Card.DueDate,
                IsCompleted = a.Card.IsCompleted,
                BoardId = a.Card.BoardList!.BoardId,
                BoardName = a.Card.BoardList.Board!.Name,
                BoardBackground = a.Card.BoardList.Board.Background,
                ListName = a.Card.BoardList.Name,
                WorkspaceName = a.Card.BoardList.Board.Workspace!.Name,
                Labels = a.Card.CardLabels
                    .Select(cl => new LabelDto
                    {
                        Id = cl.Label!.Id,
                        BoardId = cl.Label.BoardId,
                        Name = cl.Label.Name,
                        Color = cl.Label.Color
                    })
                    .ToList(),
                Assignees = a.Card.Assignees
                    .Select(other => new UserSummaryDto
                    {
                        Id = other.UserId,
                        DisplayName = other.User!.DisplayName,
                        Email = other.User.Email,
                        AvatarColor = other.User.AvatarColor
                    })
                    .ToList()
            })
            .ToListAsync(ct);

        var invitations = await db.WorkspaceInvitations
            .AsNoTracking()
            .Include(i => i.Workspace)
            .Include(i => i.InvitedBy)
            .Include(i => i.InvitedUser)
            .Where(i => i.InvitedUserId == userId && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        var assignedCount = await db.CardAssignees
            .CountAsync(
                a => a.UserId == userId && !a.Card!.IsArchived && !a.Card.IsCompleted,
                ct);

        var overdueCount = await db.CardAssignees
            .CountAsync(
                a => a.UserId == userId
                    && !a.Card!.IsArchived
                    && !a.Card.IsCompleted
                    && a.Card.DueDate != null
                    && a.Card.DueDate < now,
                ct);

        return new DashboardDto
        {
            Workspaces = workspaces,
            RecentBoards = recentBoards,
            MyCards = myCards,
            PendingInvitations = invitations.Select(i => i.ToDto()).ToList(),
            Stats = new DashboardStatsDto
            {
                WorkspaceCount = workspaces.Count,
                BoardCount = workspaces.Sum(w => w.BoardCount),
                AssignedCardCount = assignedCount,
                OverdueCardCount = overdueCount
            }
        };
    }
}
