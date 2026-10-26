using Kairo.Api.Data;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api")]
public class LabelsController(
    ApplicationDbContext db,
    IWorkspaceAccessService access,
    IBoardBroadcaster broadcaster) : ApiControllerBase
{
    [HttpGet("boards/{boardId:guid}/labels")]
    public async Task<ActionResult<List<LabelDto>>> GetByBoard(Guid boardId)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, boardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        return await LoadLabelsAsync(boardId);
    }

    [HttpPost("boards/{boardId:guid}/labels")]
    public async Task<ActionResult<LabelDto>> Create(Guid boardId, CreateLabelRequest request)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, boardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        var label = new Label
        {
            BoardId = boardId,
            Name = request.Name.Trim(),
            Color = request.Color
        };

        db.Labels.Add(label);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await BroadcastLabelsAsync(boardId);

        return label.ToDto();
    }

    [HttpPut("labels/{id:guid}")]
    public async Task<ActionResult<LabelDto>> Update(Guid id, UpdateLabelRequest request)
    {
        var label = await db.Labels.FirstOrDefaultAsync(l => l.Id == id, HttpContext.RequestAborted);
        if (label is null)
        {
            return NotFoundMessage("La etiqueta no existe.");
        }

        var boardAccess = await access.GetBoardAccessAsync(UserId, label.BoardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        label.Name = request.Name.Trim();
        label.Color = request.Color;

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await BroadcastLabelsAsync(label.BoardId);

        return label.ToDto();
    }

    [HttpDelete("labels/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var label = await db.Labels.FirstOrDefaultAsync(l => l.Id == id, HttpContext.RequestAborted);
        if (label is null)
        {
            return NotFoundMessage("La etiqueta no existe.");
        }

        var boardAccess = await access.GetBoardAccessAsync(UserId, label.BoardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        // La FK Label -> CardLabel es Restrict a propósito (ver ApplicationDbContext),
        // así que las asignaciones se quitan explícitamente antes de borrar la etiqueta.
        await db.CardLabels.Where(cl => cl.LabelId == id).ExecuteDeleteAsync(HttpContext.RequestAborted);

        db.Labels.Remove(label);
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        await BroadcastLabelsAsync(label.BoardId);

        return NoContent();
    }

    private Task<List<LabelDto>> LoadLabelsAsync(Guid boardId)
        => db.Labels
            .AsNoTracking()
            .Where(l => l.BoardId == boardId)
            .OrderBy(l => l.Name)
            .Select(l => new LabelDto
            {
                Id = l.Id,
                BoardId = l.BoardId,
                Name = l.Name,
                Color = l.Color
            })
            .ToListAsync(HttpContext.RequestAborted);

    /// <summary>
    /// Se manda la paleta completa y no el cambio suelto: son pocas etiquetas y así el
    /// cliente no tiene que reconstruir el estado a base de altas, bajas y renombrados.
    /// </summary>
    private async Task BroadcastLabelsAsync(Guid boardId)
    {
        var labels = await LoadLabelsAsync(boardId);
        await broadcaster.Board(boardId).BoardLabelsChanged(new BoardLabelsChangedEvent(boardId, labels));
    }
}
