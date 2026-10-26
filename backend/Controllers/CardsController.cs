using Kairo.Api.Data;
using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Cards;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api/cards")]
public class CardsController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IActivityService activity,
    INotificationService notifications,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CardDetailDto>> GetById(Guid id)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards
            .AsNoTracking()
            .Include(c => c.CreatedBy)
            .Include(c => c.BoardList)
            .Include(c => c.CardLabels).ThenInclude(cl => cl.Label)
            .Include(c => c.Assignees).ThenInclude(a => a.User)
            .Include(c => c.ChecklistItems)
            .Include(c => c.Comments).ThenInclude(comment => comment.User)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);

        return card is null
            ? NotFoundMessage("La tarjeta no existe.")
            : card.ToDetailDto(boardAccess.BoardId, card.BoardList?.Name ?? string.Empty);
    }

    [HttpPost]
    public async Task<ActionResult<CardDto>> Create(CreateCardRequest request)
    {
        var boardAccess = await access.GetAccessByListAsync(UserId, request.BoardListId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var siblings = await db.Cards
            .Where(c => c.BoardListId == request.BoardListId && !c.IsArchived)
            .ToListAsync(HttpContext.RequestAborted);

        var card = new Card
        {
            BoardListId = request.BoardListId,
            Title = request.Title.Trim(),
            CreatedByUserId = UserId,
            Position = request.AtTop
                ? Ordering.PositionAtStart(siblings)
                : Ordering.PositionAtEnd(siblings)
        };

        db.Cards.Add(card);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        var dto = await LoadCardDtoAsync(card.Id);
        await broadcaster.Board(boardAccess.BoardId).CardCreated(dto!);

        var listName = await GetListNameAsync(request.BoardListId);
        await activity.LogAsync(
            boardAccess.BoardId,
            UserId,
            ActivityType.CardCreated,
            card.Id,
            card.Title,
            toListName: listName,
            ct: HttpContext.RequestAborted);

        return dto!;
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CardDto>> Update(Guid id, UpdateCardRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var previousTitle = card.Title;
        var previousDescription = card.Description;
        var previousDueDate = card.DueDate;
        var previousCompleted = card.IsCompleted;

        card.Title = request.Title.Trim();
        card.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        card.DueDate = request.DueDate;
        card.IsCompleted = request.IsCompleted;
        card.CoverColor = request.CoverColor;
        card.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        var dto = await LoadCardDtoAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CardUpdated(dto!);

        await LogCardEditsAsync(boardAccess.BoardId, card, previousTitle, previousDescription, previousDueDate, previousCompleted);

        if (previousDueDate != card.DueDate)
        {
            await NotifyAssigneesAsync(card, boardAccess, NotificationType.DueDateChanged);
        }

        return dto!;
    }

    [HttpPut("{id:guid}/move")]
    public async Task<ActionResult<CardDto>> Move(Guid id, MoveCardRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        // La lista destino tiene que ser de este mismo tablero: si no, mover una tarjeta
        // sería una forma de colarla en un tablero ajeno.
        var targetList = await db.BoardLists
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == request.TargetListId, HttpContext.RequestAborted);

        if (targetList is null || targetList.BoardId != boardAccess.BoardId)
        {
            return Fail(StatusCodes.Status400BadRequest, "La lista destino no pertenece a este tablero.");
        }

        var fromListId = card.BoardListId;
        var fromListName = await GetListNameAsync(fromListId);

        var targetCards = await db.Cards
            .Where(c => c.BoardListId == request.TargetListId && !c.IsArchived)
            .OrderBy(c => c.Position)
            .ToListAsync(HttpContext.RequestAborted);

        var siblings = targetCards.Where(c => c.Id != id).AsPositioned();

        card.BoardListId = request.TargetListId;
        card.Position = Ordering.PositionAt(siblings, request.NewIndex);
        card.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        var dto = await LoadCardDtoAsync(id);

        var positions = targetCards
            .Where(c => c.Id != id)
            .Append(card)
            .OrderBy(c => c.Position)
            .Select(c => new PositionUpdate(c.Id, c.Position))
            .ToList();

        await broadcaster.Board(boardAccess.BoardId)
            .CardMoved(new CardMovedEvent(dto!, fromListId, request.TargetListId, positions));

        // Reordenar dentro de la misma lista no cuenta como noticia para el feed; cambiar de
        // columna sí, que es lo que refleja avance real del trabajo.
        if (fromListId != request.TargetListId)
        {
            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.CardMoved,
                card.Id,
                card.Title,
                fromListName,
                targetList.Name,
                ct: HttpContext.RequestAborted);
        }

        return dto!;
    }

    [HttpPut("{id:guid}/archive")]
    public async Task<IActionResult> SetArchived(Guid id, ArchiveRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        card.IsArchived = request.IsArchived;
        card.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        if (request.IsArchived)
        {
            await broadcaster.Board(boardAccess.BoardId)
                .CardArchived(new CardArchivedEvent(id, card.BoardListId));

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.CardArchived,
                card.Id,
                card.Title,
                ct: HttpContext.RequestAborted);
        }
        else
        {
            var dto = await LoadCardDtoAsync(id);
            await broadcaster.Board(boardAccess.BoardId).CardCreated(dto!);
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var listId = card.BoardListId;

        await db.CardLabels.Where(cl => cl.CardId == id).ExecuteDeleteAsync(HttpContext.RequestAborted);

        db.Cards.Remove(card);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        await broadcaster.Board(boardAccess.BoardId).CardArchived(new CardArchivedEvent(id, listId));

        return NoContent();
    }

    [HttpPost("{id:guid}/assignees")]
    public async Task<ActionResult<CardDto>> AddAssignee(Guid id, CardAssigneeRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var isMember = await db.WorkspaceMembers
            .AnyAsync(
                m => m.WorkspaceId == boardAccess.WorkspaceId && m.UserId == request.UserId,
                HttpContext.RequestAborted);

        if (!isMember)
        {
            return Fail(StatusCodes.Status400BadRequest, "Esa persona no pertenece a este espacio.");
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var already = await db.CardAssignees
            .AnyAsync(a => a.CardId == id && a.UserId == request.UserId, HttpContext.RequestAborted);

        if (!already)
        {
            db.CardAssignees.Add(new CardAssignee { CardId = id, UserId = request.UserId });
            await db.SaveChangesAsync(HttpContext.RequestAborted);
            await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);
        }

        var dto = await LoadCardDtoAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CardUpdated(dto!);

        if (!already)
        {
            var assignedName = await db.Users
                .Where(u => u.Id == request.UserId)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.CardAssigned,
                id,
                card.Title,
                detail: assignedName,
                ct: HttpContext.RequestAborted);

            await notifications.SendAsync(request.UserId, new NotificationDraft
            {
                Type = NotificationType.CardAssigned,
                ActorUserId = UserId,
                WorkspaceId = boardAccess.WorkspaceId,
                WorkspaceName = boardAccess.WorkspaceName,
                BoardId = boardAccess.BoardId,
                BoardName = boardAccess.BoardName,
                CardId = id,
                CardTitle = card.Title
            }, HttpContext.RequestAborted);
        }

        return dto!;
    }

    [HttpDelete("{id:guid}/assignees/{assigneeId}")]
    public async Task<ActionResult<CardDto>> RemoveAssignee(Guid id, string assigneeId)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var removed = await db.CardAssignees
            .Where(a => a.CardId == id && a.UserId == assigneeId)
            .ExecuteDeleteAsync(HttpContext.RequestAborted);

        var dto = await LoadCardDtoAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CardUpdated(dto!);

        if (removed > 0)
        {
            await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

            var assignedName = await db.Users
                .Where(u => u.Id == assigneeId)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.CardUnassigned,
                id,
                card.Title,
                detail: assignedName,
                ct: HttpContext.RequestAborted);
        }

        return dto!;
    }

    [HttpPost("{id:guid}/labels/{labelId:guid}")]
    public async Task<ActionResult<CardDto>> AddLabel(Guid id, Guid labelId)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var label = await db.Labels
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == labelId, HttpContext.RequestAborted);

        if (label is null || label.BoardId != boardAccess.BoardId)
        {
            return Fail(StatusCodes.Status400BadRequest, "Esa etiqueta no pertenece a este tablero.");
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var already = await db.CardLabels
            .AnyAsync(cl => cl.CardId == id && cl.LabelId == labelId, HttpContext.RequestAborted);

        if (!already)
        {
            db.CardLabels.Add(new CardLabel { CardId = id, LabelId = labelId });
            await db.SaveChangesAsync(HttpContext.RequestAborted);
            await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.LabelAdded,
                id,
                card.Title,
                detail: label.Name,
                ct: HttpContext.RequestAborted);
        }

        var dto = await LoadCardDtoAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CardUpdated(dto!);

        return dto!;
    }

    [HttpDelete("{id:guid}/labels/{labelId:guid}")]
    public async Task<ActionResult<CardDto>> RemoveLabel(Guid id, Guid labelId)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var removed = await db.CardLabels
            .Where(cl => cl.CardId == id && cl.LabelId == labelId)
            .ExecuteDeleteAsync(HttpContext.RequestAborted);

        if (removed > 0)
        {
            await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

            var labelName = await db.Labels
                .Where(l => l.Id == labelId)
                .Select(l => l.Name)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.LabelRemoved,
                id,
                card.Title,
                detail: labelName,
                ct: HttpContext.RequestAborted);
        }

        var dto = await LoadCardDtoAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CardUpdated(dto!);

        return dto!;
    }

    private Task<CardDto?> LoadCardDtoAsync(Guid cardId)
        => db.Cards
            .AsNoTracking()
            .Where(c => c.Id == cardId)
            .Select(CardProjections.Summary)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

    private Task<string?> GetListNameAsync(Guid listId)
        => db.BoardLists
            .AsNoTracking()
            .Where(l => l.Id == listId)
            .Select(l => l.Name)
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

    private async Task LogCardEditsAsync(
        Guid boardId,
        Card card,
        string previousTitle,
        string? previousDescription,
        DateTime? previousDueDate,
        bool previousCompleted)
    {
        var ct = HttpContext.RequestAborted;

        if (!string.Equals(previousTitle, card.Title, StringComparison.Ordinal))
        {
            await activity.LogAsync(boardId, UserId, ActivityType.CardRenamed, card.Id, card.Title,
                detail: previousTitle, ct: ct);
        }

        if (!string.Equals(previousDescription, card.Description, StringComparison.Ordinal))
        {
            await activity.LogAsync(boardId, UserId, ActivityType.CardDescriptionUpdated, card.Id, card.Title, ct: ct);
        }

        if (previousDueDate != card.DueDate)
        {
            var type = card.DueDate is null ? ActivityType.CardDueDateCleared : ActivityType.CardDueDateSet;
            await activity.LogAsync(boardId, UserId, type, card.Id, card.Title,
                detail: card.DueDate?.ToString("o"), ct: ct);
        }

        if (previousCompleted != card.IsCompleted)
        {
            var type = card.IsCompleted ? ActivityType.CardCompleted : ActivityType.CardReopened;
            await activity.LogAsync(boardId, UserId, type, card.Id, card.Title, ct: ct);
        }
    }

    private async Task NotifyAssigneesAsync(Card card, BoardAccess boardAccess, NotificationType type)
    {
        var assigneeIds = await db.CardAssignees
            .Where(a => a.CardId == card.Id)
            .Select(a => a.UserId)
            .ToListAsync(HttpContext.RequestAborted);

        if (assigneeIds.Count == 0)
        {
            return;
        }

        await notifications.SendManyAsync(assigneeIds, new NotificationDraft
        {
            Type = type,
            ActorUserId = UserId,
            WorkspaceId = boardAccess.WorkspaceId,
            WorkspaceName = boardAccess.WorkspaceName,
            BoardId = boardAccess.BoardId,
            BoardName = boardAccess.BoardName,
            CardId = card.Id,
            CardTitle = card.Title,
            Detail = card.DueDate?.ToString("o")
        }, HttpContext.RequestAborted);
    }
}
