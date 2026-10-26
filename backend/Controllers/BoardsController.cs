using Kairo.Api.Data;
using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Cards;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.DTOs.Lists;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api/boards")]
public class BoardsController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IOnboardingService onboarding,
    IActivityService activity,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    /// <summary>Tableros abiertos hace poco, para el dashboard.</summary>
    [HttpGet("recent")]
    public async Task<ActionResult<List<BoardSummaryDto>>> GetRecent([FromQuery] int take = 6)
    {
        var userId = UserId;
        take = Math.Clamp(take, 1, 20);

        var boards = await db.BoardVisits
            .AsNoTracking()
            .Where(v => v.UserId == userId && !v.Board!.IsArchived)
            .OrderByDescending(v => v.VisitedAt)
            .Take(take)
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
            .ToListAsync(HttpContext.RequestAborted);

        return boards;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BoardDetailDto>> GetById(Guid id)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var role = boardAccess.Role;

        // Se proyecta a DTO directamente en vez de traer entidades con Include: el tablero
        // completo con tarjetas, etiquetas y responsables sale en una sola consulta y sin
        // cargar columnas que la vista de tablero no usa (descripciones, comentarios…).
        var board = await db.Boards
            .AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new BoardDetailDto
            {
                Id = b.Id,
                WorkspaceId = b.WorkspaceId,
                WorkspaceName = b.Workspace!.Name,
                Name = b.Name,
                Description = b.Description,
                Background = b.Background,
                IsArchived = b.IsArchived,
                MyRole = role,
                CreatedAt = b.CreatedAt,
                Labels = b.Labels
                    .OrderBy(l => l.Name)
                    .Select(l => new LabelDto
                    {
                        Id = l.Id,
                        BoardId = l.BoardId,
                        Name = l.Name,
                        Color = l.Color
                    })
                    .ToList(),
                Members = b.Workspace!.Members
                    .OrderBy(m => m.Role)
                    .ThenBy(m => m.User!.DisplayName)
                    .Select(m => new WorkspaceMemberDto
                    {
                        UserId = m.UserId,
                        DisplayName = m.User!.DisplayName,
                        Email = m.User.Email,
                        AvatarColor = m.User.AvatarColor,
                        Role = m.Role,
                        JoinedAt = m.JoinedAt
                    })
                    .ToList(),
                Lists = b.Lists
                    .Where(l => !l.IsArchived)
                    .OrderBy(l => l.Position)
                    .Select(l => new BoardListDto
                    {
                        Id = l.Id,
                        BoardId = l.BoardId,
                        Name = l.Name,
                        Position = l.Position,
                        IsArchived = l.IsArchived,
                        Cards = l.Cards
                            .Where(c => !c.IsArchived)
                            .OrderBy(c => c.Position)
                            .Select(c => new CardDto
                            {
                                Id = c.Id,
                                BoardListId = c.BoardListId,
                                Title = c.Title,
                                HasDescription = c.Description != null && c.Description != "",
                                Position = c.Position,
                                DueDate = c.DueDate,
                                IsCompleted = c.IsCompleted,
                                CoverColor = c.CoverColor,
                                IsArchived = c.IsArchived,
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
                                    .ToList(),
                                ChecklistTotal = c.ChecklistItems.Count,
                                ChecklistDone = c.ChecklistItems.Count(i => i.IsCompleted),
                                CommentCount = c.Comments.Count
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(HttpContext.RequestAborted);

        if (board is null)
        {
            return NotFoundMessage("El tablero no existe.");
        }

        await RecordVisitAsync(id);

        return board;
    }

    [HttpPost]
    public async Task<ActionResult<BoardDetailDto>> Create(CreateBoardRequest request)
    {
        var role = await access.GetRoleAsync(UserId, request.WorkspaceId, HttpContext.RequestAborted);
        if (role is null)
        {
            return NoAccess();
        }

        var board = new Board
        {
            WorkspaceId = request.WorkspaceId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Background = request.Background,
            CreatedByUserId = UserId
        };

        db.Boards.Add(board);

        if (request.UseStarterTemplate)
        {
            db.BoardLists.AddRange(onboarding.BuildStarterLists(board.Id));
            db.Labels.AddRange(onboarding.BuildStarterLabels(board.Id));
        }

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await activity.LogAsync(
            board.Id,
            UserId,
            ActivityType.BoardCreated,
            detail: board.Name,
            ct: HttpContext.RequestAborted);

        return await GetById(board.Id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateBoardRequest request)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == id, HttpContext.RequestAborted);
        if (board is null)
        {
            return NotFoundMessage("El tablero no existe.");
        }

        var previousName = board.Name;

        board.Name = request.Name.Trim();
        board.Description = request.Description?.Trim();
        board.Background = request.Background;
        board.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await broadcaster.Board(id)
            .BoardInfoChanged(new BoardInfoChangedEvent(id, board.Name, board.Description, board.Background));

        if (!string.Equals(previousName, board.Name, StringComparison.Ordinal))
        {
            await activity.LogAsync(
                id,
                UserId,
                ActivityType.BoardRenamed,
                detail: board.Name,
                ct: HttpContext.RequestAborted);
        }

        return NoContent();
    }

    [HttpPut("{id:guid}/archive")]
    public async Task<IActionResult> SetArchived(Guid id, ArchiveRequest request)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        if (boardAccess.Role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden archivar tableros.");
        }

        var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == id, HttpContext.RequestAborted);
        if (board is null)
        {
            return NotFoundMessage("El tablero no existe.");
        }

        board.IsArchived = request.IsArchived;
        board.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, id, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        if (boardAccess.Role == WorkspaceRole.Member)
        {
            return Fail(StatusCodes.Status403Forbidden, "Solo Owner o Admin pueden eliminar tableros.");
        }

        var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == id, HttpContext.RequestAborted);
        if (board is null)
        {
            return NotFoundMessage("El tablero no existe.");
        }

        // Las etiquetas no llegan en cascada desde las tarjetas (ver ApplicationDbContext),
        // así que sus asignaciones se quitan a mano antes de borrar el tablero.
        await db.CardLabels
            .Where(cl => cl.Label!.BoardId == id)
            .ExecuteDeleteAsync(HttpContext.RequestAborted);

        db.Boards.Remove(board);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    /// <summary>Deja constancia de que este usuario abrió el tablero (alimenta "recientes").</summary>
    private async Task RecordVisitAsync(Guid boardId)
    {
        var userId = UserId;

        var updated = await db.BoardVisits
            .Where(v => v.BoardId == boardId && v.UserId == userId)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(v => v.VisitedAt, DateTime.UtcNow),
                HttpContext.RequestAborted);

        if (updated > 0)
        {
            return;
        }

        db.BoardVisits.Add(new BoardVisit { BoardId = boardId, UserId = userId });

        try
        {
            await db.SaveChangesAsync(HttpContext.RequestAborted);
        }
        catch (DbUpdateException)
        {
            // Dos pestañas abriendo el mismo tablero a la vez pueden chocar en la clave
            // primaria. Es solo telemetría de "visto recientemente": no vale la pena
            // reventar la petición por esto.
            db.ChangeTracker.Clear();
        }
    }
}
