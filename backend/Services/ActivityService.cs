using Kairo.Api.Data;
using Kairo.Api.DTOs.Activity;
using Kairo.Api.DTOs.Common;
using Kairo.Api.Models;
using Kairo.Api.Realtime;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Services;

public class ActivityService(ApplicationDbContext db, IBoardBroadcaster broadcaster) : IActivityService
{
    public async Task LogAsync(
        Guid boardId,
        string actorUserId,
        ActivityType type,
        Guid? cardId = null,
        string? cardTitle = null,
        string? fromListName = null,
        string? toListName = null,
        string? detail = null,
        CancellationToken ct = default)
    {
        var entry = new ActivityLogEntry
        {
            BoardId = boardId,
            ActorUserId = actorUserId,
            Type = type,
            CardId = cardId,
            CardTitle = Truncate(cardTitle, 200),
            FromListName = Truncate(fromListName, 100),
            ToListName = Truncate(toListName, 100),
            Detail = Truncate(detail, 300)
        };

        db.ActivityLog.Add(entry);
        await db.SaveChangesAsync(ct);

        var actor = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == actorUserId, ct);

        var dto = new ActivityDto
        {
            Id = entry.Id,
            BoardId = entry.BoardId,
            Type = entry.Type,
            Actor = actor?.ToSummary() ?? new UserSummaryDto(),
            CardId = entry.CardId,
            CardTitle = entry.CardTitle,
            FromListName = entry.FromListName,
            ToListName = entry.ToListName,
            Detail = entry.Detail,
            CreatedAt = entry.CreatedAt
        };

        await broadcaster.Board(boardId).ActivityAdded(dto);
    }

    // Los textos vienen de nombres que el usuario escribe; recortarlos aquí evita que un
    // título largo tumbe el insert por longitud de columna.
    private static string? Truncate(string? value, int max)
        => value is null || value.Length <= max ? value : value[..max];
}
