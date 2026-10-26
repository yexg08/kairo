using Kairo.Api.Data;
using Kairo.Api.DTOs.Checklist;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api")]
public class ChecklistController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IActivityService activity,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    [HttpPost("cards/{cardId:guid}/checklist")]
    public async Task<ActionResult<ChecklistItemDto>> Create(Guid cardId, CreateChecklistItemRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, cardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var siblings = await db.ChecklistItems
            .Where(i => i.CardId == cardId)
            .ToListAsync(HttpContext.RequestAborted);

        var item = new ChecklistItem
        {
            CardId = cardId,
            Text = request.Text.Trim(),
            Position = Ordering.PositionAtEnd(siblings)
        };

        db.ChecklistItems.Add(item);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        await BroadcastChecklistAsync(boardAccess.BoardId, cardId);

        await activity.LogAsync(
            boardAccess.BoardId,
            UserId,
            ActivityType.ChecklistItemAdded,
            cardId,
            await GetCardTitleAsync(cardId),
            detail: item.Text,
            ct: HttpContext.RequestAborted);

        return item.ToDto();
    }

    [HttpPut("checklist/{id:guid}")]
    public async Task<ActionResult<ChecklistItemDto>> Update(Guid id, UpdateChecklistItemRequest request)
    {
        var item = await db.ChecklistItems.FirstOrDefaultAsync(i => i.Id == id, HttpContext.RequestAborted);
        if (item is null)
        {
            return NotFoundMessage("El ítem no existe.");
        }

        var boardAccess = await access.GetAccessByCardAsync(UserId, item.CardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var wasCompleted = item.IsCompleted;

        item.Text = request.Text.Trim();
        item.IsCompleted = request.IsCompleted;

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        await BroadcastChecklistAsync(boardAccess.BoardId, item.CardId);

        if (wasCompleted != item.IsCompleted)
        {
            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                item.IsCompleted ? ActivityType.ChecklistItemCompleted : ActivityType.ChecklistItemReopened,
                item.CardId,
                await GetCardTitleAsync(item.CardId),
                detail: item.Text,
                ct: HttpContext.RequestAborted);
        }

        return item.ToDto();
    }

    [HttpDelete("checklist/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await db.ChecklistItems.FirstOrDefaultAsync(i => i.Id == id, HttpContext.RequestAborted);
        if (item is null)
        {
            return NotFoundMessage("El ítem no existe.");
        }

        var boardAccess = await access.GetAccessByCardAsync(UserId, item.CardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var cardId = item.CardId;
        var text = item.Text;

        db.ChecklistItems.Remove(item);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        await BroadcastChecklistAsync(boardAccess.BoardId, cardId);

        await activity.LogAsync(
            boardAccess.BoardId,
            UserId,
            ActivityType.ChecklistItemRemoved,
            cardId,
            await GetCardTitleAsync(cardId),
            detail: text,
            ct: HttpContext.RequestAborted);

        return NoContent();
    }

    /// <summary>
    /// Manda la checklist completa al tablero y, además, la tarjeta actualizada: la barra de
    /// progreso se ve tanto dentro de la tarjeta abierta como en su miniatura del tablero.
    /// </summary>
    private async Task BroadcastChecklistAsync(Guid boardId, Guid cardId)
    {
        var items = await db.ChecklistItems
            .AsNoTracking()
            .Where(i => i.CardId == cardId)
            .OrderBy(i => i.Position)
            .Select(i => new ChecklistItemDto
            {
                Id = i.Id,
                CardId = i.CardId,
                Text = i.Text,
                IsCompleted = i.IsCompleted,
                Position = i.Position
            })
            .ToListAsync(HttpContext.RequestAborted);

        var done = items.Count(i => i.IsCompleted);

        await broadcaster.Board(boardId)
            .ChecklistChanged(new ChecklistChangedEvent(cardId, items, items.Count, done));

        var card = await db.Cards
            .AsNoTracking()
            .Where(c => c.Id == cardId)
            .Select(CardProjections.Summary)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        if (card is not null)
        {
            await broadcaster.Board(boardId).CardUpdated(card);
        }
    }

    private Task<string?> GetCardTitleAsync(Guid cardId)
        => db.Cards
            .AsNoTracking()
            .Where(c => c.Id == cardId)
            .Select(c => c.Title)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);
}
