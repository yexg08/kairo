using Kairo.Api.Data;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Dashboard;
using Kairo.Api.DTOs.Labels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

/// <summary>Filtros de fecha límite disponibles en la búsqueda.</summary>
public enum DueFilter
{
    Any = 0,
    Overdue = 1,
    Today = 2,
    ThisWeek = 3,
    NoDueDate = 4
}

[Route("api/search")]
public class SearchController(ApplicationDbContext db) : ApiControllerBase
{
    [HttpGet("cards")]
    public async Task<ActionResult<List<CardSearchResultDto>>> SearchCards(
        [FromQuery] string? query = null,
        [FromQuery] Guid? workspaceId = null,
        [FromQuery] Guid? boardId = null,
        [FromQuery] Guid? labelId = null,
        [FromQuery] string? assigneeId = null,
        [FromQuery] DueFilter due = DueFilter.Any,
        [FromQuery] bool includeCompleted = false,
        [FromQuery] int take = 50)
    {
        var userId = UserId;
        var ct = HttpContext.RequestAborted;
        take = Math.Clamp(take, 1, 100);

        // El filtro de membresía va primero y no es opcional: la búsqueda solo puede
        // alcanzar tarjetas de espacios a los que el usuario pertenece.
        var cards = db.Cards
            .AsNoTracking()
            .Where(c => !c.IsArchived
                && !c.BoardList!.IsArchived
                && !c.BoardList.Board!.IsArchived
                && c.BoardList.Board.Workspace!.Members.Any(m => m.UserId == userId));

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            cards = cards.Where(c => c.Title.Contains(term)
                || (c.Description != null && c.Description.Contains(term)));
        }

        if (workspaceId is { } wsId)
        {
            cards = cards.Where(c => c.BoardList!.Board!.WorkspaceId == wsId);
        }

        if (boardId is { } bId)
        {
            cards = cards.Where(c => c.BoardList!.BoardId == bId);
        }

        if (labelId is { } lId)
        {
            cards = cards.Where(c => c.CardLabels.Any(cl => cl.LabelId == lId));
        }

        if (!string.IsNullOrWhiteSpace(assigneeId))
        {
            cards = cards.Where(c => c.Assignees.Any(a => a.UserId == assigneeId));
        }

        if (!includeCompleted)
        {
            cards = cards.Where(c => !c.IsCompleted);
        }

        cards = ApplyDueFilter(cards, due);

        return await cards
            .OrderBy(c => c.DueDate == null)
            .ThenBy(c => c.DueDate)
            .ThenByDescending(c => c.UpdatedAt)
            .Take(take)
            .Select(c => new CardSearchResultDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                DueDate = c.DueDate,
                IsCompleted = c.IsCompleted,
                BoardId = c.BoardList!.BoardId,
                BoardName = c.BoardList.Board!.Name,
                ListName = c.BoardList.Name,
                WorkspaceId = c.BoardList.Board.WorkspaceId,
                WorkspaceName = c.BoardList.Board.Workspace!.Name,
                Labels = c.CardLabels
                    .Select(cl => new LabelDto
                    {
                        Id = cl.Label!.Id,
                        BoardId = cl.Label.BoardId,
                        Name = cl.Label.Name,
                        Color = cl.Label.Color
                    })
                    .ToList(),
                Assignees = c.Assignees
                    .Select(a => new UserSummaryDto
                    {
                        Id = a.UserId,
                        DisplayName = a.User!.DisplayName,
                        Email = a.User.Email,
                        AvatarColor = a.User.AvatarColor
                    })
                    .ToList()
            })
            .ToListAsync(ct);
    }

    private static IQueryable<Models.Card> ApplyDueFilter(IQueryable<Models.Card> cards, DueFilter due)
    {
        var now = DateTime.UtcNow;
        var endOfToday = now.Date.AddDays(1);
        var endOfWeek = now.Date.AddDays(7);

        return due switch
        {
            DueFilter.Overdue => cards.Where(c => c.DueDate != null && c.DueDate < now),
            DueFilter.Today => cards.Where(c => c.DueDate != null && c.DueDate < endOfToday),
            DueFilter.ThisWeek => cards.Where(c => c.DueDate != null && c.DueDate < endOfWeek),
            DueFilter.NoDueDate => cards.Where(c => c.DueDate == null),
            _ => cards
        };
    }
}
