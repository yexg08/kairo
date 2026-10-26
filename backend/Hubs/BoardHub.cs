using System.Collections.Concurrent;
using Kairo.Api.Data;
using Kairo.Api.DTOs.Common;
using Kairo.Api.Realtime;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Hubs;

/// <summary>
/// Un cliente se suscribe a los tableros que tiene abiertos con <see cref="JoinBoard"/> y
/// recibe por ese grupo todo lo que pase en ellos. Las notificaciones personales no van por
/// grupo de tablero: SignalR las entrega por usuario con Clients.User(...).
/// </summary>
[Authorize]
public class BoardHub(IWorkspaceAccessService access, ApplicationDbContext db) : Hub<IBoardClient>
{
    /// <summary>
    /// Quién está viendo cada tablero, por conexión (una misma persona puede tener dos
    /// pestañas). Vive en memoria a propósito: es estado efímero que no tiene sentido
    /// persistir, y si el proceso se reinicia los clientes se vuelven a anunciar al reconectar.
    /// </summary>
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, UserSummaryDto>> Viewers = new();

    public async Task JoinBoard(Guid boardId)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        // Aunque el hub exija autenticación, el id del tablero llega del cliente: hay que
        // comprobar que ese usuario tenga acceso antes de meterlo en el grupo.
        var boardAccess = await access.GetBoardAccessAsync(userId, boardId, Context.ConnectionAborted);
        if (boardAccess is null)
        {
            throw new HubException("No tienes acceso a este tablero.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Board(boardId), Context.ConnectionAborted);

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, Context.ConnectionAborted);

        if (user is not null)
        {
            Viewers.GetOrAdd(boardId, _ => new ConcurrentDictionary<string, UserSummaryDto>())
                [Context.ConnectionId] = user.ToSummary();
        }

        await BroadcastPresenceAsync(boardId);
    }

    public async Task LeaveBoard(Guid boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, RealtimeGroups.Board(boardId));

        if (Viewers.TryGetValue(boardId, out var boardViewers) &&
            boardViewers.TryRemove(Context.ConnectionId, out _))
        {
            await BroadcastPresenceAsync(boardId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // No se guarda a qué tableros se unió cada conexión: son pocos y recorrerlos al
        // desconectar sale más barato que mantener un índice inverso sincronizado.
        foreach (var (boardId, boardViewers) in Viewers)
        {
            if (boardViewers.TryRemove(Context.ConnectionId, out _))
            {
                await BroadcastPresenceAsync(boardId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Task BroadcastPresenceAsync(Guid boardId)
    {
        var viewers = Viewers.TryGetValue(boardId, out var boardViewers)
            ? boardViewers.Values
                .GroupBy(v => v.Id)
                .Select(g => g.First())
                .OrderBy(v => v.DisplayName)
                .ToList()
            : [];

        return Clients.Group(RealtimeGroups.Board(boardId))
            .PresenceChanged(new BoardPresenceEvent(boardId, viewers));
    }
}
