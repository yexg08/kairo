using Kairo.Api.Data;
using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Lists;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api")]
public class ListsController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IActivityService activity,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    [HttpPost("boards/{boardId:guid}/lists")]
    public async Task<ActionResult<BoardListDto>> Create(Guid boardId, CreateListRequest request)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, boardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var siblings = await db.BoardLists
            .Where(l => l.BoardId == boardId && !l.IsArchived)
            .ToListAsync(HttpContext.RequestAborted);

        var list = new BoardList
        {
            BoardId = boardId,
            Name = request.Name.Trim(),
            Position = Ordering.PositionAtEnd(siblings)
        };

        db.BoardLists.Add(list);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardId, HttpContext.RequestAborted);

        var dto = list.ToDto();
        await broadcaster.Board(boardId).ListCreated(dto);

        await activity.LogAsync(
            boardId,
            UserId,
            ActivityType.ListCreated,
            toListName: list.Name,
            ct: HttpContext.RequestAborted);

        return dto;
    }

    [HttpPut("lists/{id:guid}")]
    public async Task<ActionResult<BoardListDto>> Rename(Guid id, UpdateListRequest request)
    {
        var boardAccess = await access.GetAccessByListAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var list = await db.BoardLists.FirstOrDefaultAsync(l => l.Id == id, HttpContext.RequestAborted);
        if (list is null)
        {
            return NotFoundMessage("La lista no existe.");
        }

        var previousName = list.Name;
        list.Name = request.Name.Trim();

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        var dto = list.ToDto();
        await broadcaster.Board(boardAccess.BoardId).ListRenamed(new ListRenamedEvent(id, list.Name));

        if (!string.Equals(previousName, list.Name, StringComparison.Ordinal))
        {
            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.ListRenamed,
                fromListName: previousName,
                toListName: list.Name,
                ct: HttpContext.RequestAborted);
        }

        return dto;
    }

    [HttpPut("lists/{id:guid}/move")]
    public async Task<IActionResult> Move(Guid id, MoveListRequest request)
    {
        var boardAccess = await access.GetAccessByListAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var lists = await db.BoardLists
            .Where(l => l.BoardId == boardAccess.BoardId && !l.IsArchived)
            .OrderBy(l => l.Position)
            .ToListAsync(HttpContext.RequestAborted);

        var moving = lists.FirstOrDefault(l => l.Id == id);
        if (moving is null)
        {
            return NotFoundMessage("La lista no existe.");
        }

        var siblings = lists.Where(l => l.Id != id).AsPositioned();
        moving.Position = Ordering.PositionAt(siblings, request.NewIndex);

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        // Se mandan todas las posiciones y no solo la de la lista movida: si hubo
        // rebalanceo, las vecinas también cambiaron.
        var positions = lists
            .OrderBy(l => l.Position)
            .Select(l => new PositionUpdate(l.Id, l.Position))
            .ToList();

        await broadcaster.Board(boardAccess.BoardId)
            .ListMoved(new ListMovedEvent(boardAccess.BoardId, id, positions));

        await activity.LogAsync(
            boardAccess.BoardId,
            UserId,
            ActivityType.ListMoved,
            toListName: moving.Name,
            ct: HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpPut("lists/{id:guid}/archive")]
    public async Task<IActionResult> SetArchived(Guid id, ArchiveRequest request)
    {
        var boardAccess = await access.GetAccessByListAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var list = await db.BoardLists.FirstOrDefaultAsync(l => l.Id == id, HttpContext.RequestAborted);
        if (list is null)
        {
            return NotFoundMessage("La lista no existe.");
        }

        list.IsArchived = request.IsArchived;

        if (request.IsArchived)
        {
            // Archivar la columna archiva lo que hay dentro: dejar tarjetas activas en una
            // lista invisible es la forma más fácil de perderlas de vista para siempre.
            await db.Cards
                .Where(c => c.BoardListId == id && !c.IsArchived)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(c => c.IsArchived, true),
                    HttpContext.RequestAborted);
        }

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        if (request.IsArchived)
        {
            await broadcaster.Board(boardAccess.BoardId).ListArchived(new ListArchivedEvent(id));

            await activity.LogAsync(
                boardAccess.BoardId,
                UserId,
                ActivityType.ListArchived,
                toListName: list.Name,
                ct: HttpContext.RequestAborted);
        }
        else
        {
            await broadcaster.Board(boardAccess.BoardId).ListCreated(list.ToDto());
        }

        return NoContent();
    }

    [HttpDelete("lists/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var boardAccess = await access.GetAccessByListAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        if (boardAccess.Role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden eliminar listas.");
        }

        var list = await db.BoardLists.FirstOrDefaultAsync(l => l.Id == id, HttpContext.RequestAborted);
        if (list is null)
        {
            return NotFoundMessage("La lista no existe.");
        }

        // Igual que al borrar un tablero: las etiquetas de las tarjetas no van en cascada.
        await db.CardLabels
            .Where(cl => cl.Card!.BoardListId == id)
            .ExecuteDeleteAsync(HttpContext.RequestAborted);

        db.BoardLists.Remove(list);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        await broadcaster.Board(boardAccess.BoardId).ListArchived(new ListArchivedEvent(id));

        return NoContent();
    }
}
