using Kairo.Api.Models;

namespace Kairo.Api.Services;

public interface IActivityService
{
    /// <summary>
    /// Deja constancia del evento en el feed del tablero y lo empuja en vivo a quien lo tenga
    /// abierto. Guarda por su cuenta, así que se llama después de persistir el cambio real.
    /// </summary>
    Task LogAsync(
        Guid boardId,
        string actorUserId,
        ActivityType type,
        Guid? cardId = null,
        string? cardTitle = null,
        string? fromListName = null,
        string? toListName = null,
        string? detail = null,
        CancellationToken ct = default);
}
