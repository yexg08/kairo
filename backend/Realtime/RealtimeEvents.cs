using Kairo.Api.DTOs.Cards;
using Kairo.Api.DTOs.Checklist;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;

namespace Kairo.Api.Realtime;

/// <summary>Nueva posición de un elemento arrastrable.</summary>
public record PositionUpdate(Guid Id, double Position);

/// <summary>
/// La tarjeta ya viene con su lista y posición nuevas. <see cref="FromListId"/> es lo único
/// que el cliente no podría deducir (necesita sacarla de donde estaba), y
/// <see cref="Positions"/> trae el resto de la lista destino porque un rebalanceo puede
/// haber movido a sus vecinas.
/// </summary>
public record CardMovedEvent(
    CardDto Card,
    Guid FromListId,
    Guid ToListId,
    IReadOnlyList<PositionUpdate> Positions);

public record CardArchivedEvent(Guid CardId, Guid BoardListId);

public record ListArchivedEvent(Guid ListId);

/// <summary>
/// Solo el nombre: renombrar no puede llevar la lista entera por delante o los clientes
/// se quedarían sin las tarjetas que el servidor no cargó para responder.
/// </summary>
public record ListRenamedEvent(Guid ListId, string Name);

public record ListMovedEvent(Guid BoardId, Guid ListId, IReadOnlyList<PositionUpdate> Positions);

public record ChecklistChangedEvent(Guid CardId, IReadOnlyList<ChecklistItemDto> Items, int Total, int Done);

public record BoardLabelsChangedEvent(Guid BoardId, IReadOnlyList<LabelDto> Labels);

public record CommentDeletedEvent(Guid CardId, Guid CommentId, int CommentCount);

public record BoardInfoChangedEvent(Guid BoardId, string Name, string? Description, string Background);

/// <summary>Quién tiene el tablero abierto ahora mismo (avatares en la barra superior).</summary>
public record BoardPresenceEvent(Guid BoardId, IReadOnlyList<UserSummaryDto> Viewers);
