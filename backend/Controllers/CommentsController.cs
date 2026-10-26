using Kairo.Api.Data;
using Kairo.Api.DTOs.Comments;
using Kairo.Api.DTOs.Common;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api")]
public class CommentsController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IActivityService activity,
    INotificationService notifications,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    [HttpGet("cards/{cardId:guid}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetByCard(Guid cardId)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, cardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        return await db.Comments
            .AsNoTracking()
            .Where(c => c.CardId == cardId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                CardId = c.CardId,
                Text = c.Text,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                Author = new UserSummaryDto
                {
                    Id = c.UserId,
                    DisplayName = c.User!.DisplayName,
                    Email = c.User.Email,
                    AvatarColor = c.User.AvatarColor
                }
            })
            .ToListAsync(HttpContext.RequestAborted);
    }

    [HttpPost("cards/{cardId:guid}/comments")]
    public async Task<ActionResult<CommentDto>> Create(Guid cardId, CreateCommentRequest request)
    {
        var boardAccess = await access.GetAccessByCardAsync(UserId, cardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var card = await db.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId, HttpContext.RequestAborted);

        if (card is null)
        {
            return NotFoundMessage("La tarjeta no existe.");
        }

        var comment = new Comment
        {
            CardId = cardId,
            UserId = UserId,
            Text = request.Text.Trim()
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await db.TouchBoardAsync(boardAccess.BoardId, HttpContext.RequestAborted);

        var dto = await LoadCommentAsync(comment.Id);
        await broadcaster.Board(boardAccess.BoardId).CommentAdded(dto!);
        await BroadcastCardAsync(boardAccess.BoardId, cardId);

        await activity.LogAsync(
            boardAccess.BoardId,
            UserId,
            ActivityType.CommentAdded,
            cardId,
            card.Title,
            detail: Preview(comment.Text),
            ct: HttpContext.RequestAborted);

        // Se avisa a quien tiene la tarjeta asignada y a quien la creó: son los que están
        // pendientes de ella. Al autor del comentario no, obviamente.
        var interested = await db.CardAssignees
            .Where(a => a.CardId == cardId)
            .Select(a => a.UserId)
            .ToListAsync(HttpContext.RequestAborted);

        interested.Add(card.CreatedByUserId);

        await notifications.SendManyAsync(interested, new NotificationDraft
        {
            Type = NotificationType.CommentOnCard,
            ActorUserId = UserId,
            WorkspaceId = boardAccess.WorkspaceId,
            WorkspaceName = boardAccess.WorkspaceName,
            BoardId = boardAccess.BoardId,
            BoardName = boardAccess.BoardName,
            CardId = cardId,
            CardTitle = card.Title,
            Detail = Preview(comment.Text)
        }, HttpContext.RequestAborted);

        return dto!;
    }

    [HttpPut("comments/{id:guid}")]
    public async Task<ActionResult<CommentDto>> Update(Guid id, UpdateCommentRequest request)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (comment is null)
        {
            return NotFoundMessage("El comentario no existe.");
        }

        var boardAccess = await access.GetAccessByCardAsync(UserId, comment.CardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        if (comment.UserId != UserId)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo puedes editar tus propios comentarios.");
        }

        comment.Text = request.Text.Trim();
        comment.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        var dto = await LoadCommentAsync(id);
        await broadcaster.Board(boardAccess.BoardId).CommentUpdated(dto!);

        return dto!;
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == id, HttpContext.RequestAborted);
        if (comment is null)
        {
            return NotFoundMessage("El comentario no existe.");
        }

        var boardAccess = await access.GetAccessByCardAsync(UserId, comment.CardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        // El autor borra lo suyo; Owner y Admin pueden moderar el tablero.
        var canDelete = comment.UserId == UserId || boardAccess.Role != WorkspaceRole.Member;
        if (!canDelete)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo puedes borrar tus propios comentarios.");
        }

        var cardId = comment.CardId;

        db.Comments.Remove(comment);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        var remaining = await db.Comments.CountAsync(c => c.CardId == cardId, HttpContext.RequestAborted);

        await broadcaster.Board(boardAccess.BoardId)
            .CommentDeleted(new CommentDeletedEvent(cardId, id, remaining));

        await BroadcastCardAsync(boardAccess.BoardId, cardId);

        return NoContent();
    }

    private Task<CommentDto?> LoadCommentAsync(Guid commentId)
        => db.Comments
            .AsNoTracking()
            .Where(c => c.Id == commentId)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                CardId = c.CardId,
                Text = c.Text,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                Author = new UserSummaryDto
                {
                    Id = c.UserId,
                    DisplayName = c.User!.DisplayName,
                    Email = c.User.Email,
                    AvatarColor = c.User.AvatarColor
                }
            })
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

    /// <summary>Refresca la miniatura de la tarjeta, que muestra el número de comentarios.</summary>
    private async Task BroadcastCardAsync(Guid boardId, Guid cardId)
    {
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

    private static string Preview(string text)
        => text.Length <= 120 ? text : text[..120] + "…";
}
