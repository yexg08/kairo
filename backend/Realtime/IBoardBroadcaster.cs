using Kairo.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Kairo.Api.Realtime;

/// <summary>
/// Fachada sobre el hub para que los controladores no tengan que saber de grupos ni de
/// <see cref="IHubContext{THub,T}"/>: <c>broadcaster.Board(id).CardCreated(dto)</c>.
/// </summary>
public interface IBoardBroadcaster
{
    /// <summary>Todos los que tienen ese tablero abierto.</summary>
    IBoardClient Board(Guid boardId);

    /// <summary>Todas las conexiones de un usuario, esté donde esté.</summary>
    IBoardClient User(string userId);
}

public class BoardBroadcaster(IHubContext<BoardHub, IBoardClient> hub) : IBoardBroadcaster
{
    public IBoardClient Board(Guid boardId) => hub.Clients.Group(RealtimeGroups.Board(boardId));

    public IBoardClient User(string userId) => hub.Clients.User(userId);
}
