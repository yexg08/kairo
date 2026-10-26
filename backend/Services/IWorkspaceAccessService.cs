using Kairo.Api.Models;

namespace Kairo.Api.Services;

/// <summary>Datos de acceso a un tablero, resueltos en una sola consulta.</summary>
public record BoardAccess(
    Guid BoardId,
    string BoardName,
    Guid WorkspaceId,
    string WorkspaceName,
    WorkspaceRole Role,
    bool IsArchived);

public interface IWorkspaceAccessService
{
    /// <summary>Rol del usuario en el workspace, o null si no es miembro.</summary>
    Task<WorkspaceRole?> GetRoleAsync(string userId, Guid workspaceId, CancellationToken ct = default);

    /// <summary>Acceso al tablero vía la membresía del workspace, o null si no le corresponde verlo.</summary>
    Task<BoardAccess?> GetBoardAccessAsync(string userId, Guid boardId, CancellationToken ct = default);

    /// <summary>Igual que <see cref="GetBoardAccessAsync"/> pero partiendo de una lista.</summary>
    Task<BoardAccess?> GetAccessByListAsync(string userId, Guid listId, CancellationToken ct = default);

    /// <summary>Igual que <see cref="GetBoardAccessAsync"/> pero partiendo de una tarjeta.</summary>
    Task<BoardAccess?> GetAccessByCardAsync(string userId, Guid cardId, CancellationToken ct = default);

    /// <summary>Ids de los usuarios del workspace al que pertenece el tablero.</summary>
    Task<List<string>> GetBoardMemberIdsAsync(Guid boardId, CancellationToken ct = default);
}
