using Kairo.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Services;

public static class DbContextExtensions
{
    /// <summary>
    /// Marca el tablero como tocado ahora mismo. Es lo que ordena "vistos recientemente" y
    /// la lista de tableros del espacio, así que cualquier cambio de contenido pasa por aquí.
    /// </summary>
    public static Task TouchBoardAsync(this ApplicationDbContext db, Guid boardId, CancellationToken ct = default)
        => db.Boards
            .Where(b => b.Id == boardId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(b => b.UpdatedAt, DateTime.UtcNow), ct);
}
