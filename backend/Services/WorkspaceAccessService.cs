using Kairo.Api.Data;
using Kairo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Services;

public class WorkspaceAccessService(ApplicationDbContext db) : IWorkspaceAccessService
{
    public async Task<WorkspaceRole?> GetRoleAsync(string userId, Guid workspaceId, CancellationToken ct = default)
    {
        var member = await db.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.WorkspaceId == workspaceId && m.UserId == userId)
            .Select(m => new { m.Role })
            .FirstOrDefaultAsync(ct);

        return member?.Role;
    }

    public Task<BoardAccess?> GetBoardAccessAsync(string userId, Guid boardId, CancellationToken ct = default)
        => QueryAccess(userId, db.Boards.Where(b => b.Id == boardId), ct);

    public Task<BoardAccess?> GetAccessByListAsync(string userId, Guid listId, CancellationToken ct = default)
        => QueryAccess(userId, db.BoardLists.Where(l => l.Id == listId).Select(l => l.Board!), ct);

    public Task<BoardAccess?> GetAccessByCardAsync(string userId, Guid cardId, CancellationToken ct = default)
        => QueryAccess(userId, db.Cards.Where(c => c.Id == cardId).Select(c => c.BoardList!.Board!), ct);

    public Task<List<string>> GetBoardMemberIdsAsync(Guid boardId, CancellationToken ct = default)
        => db.Boards
            .AsNoTracking()
            .Where(b => b.Id == boardId)
            .SelectMany(b => b.Workspace!.Members.Select(m => m.UserId))
            .ToListAsync(ct);

    /// <summary>
    /// El join contra WorkspaceMembers es lo que hace de control de permisos: si el usuario
    /// no es miembro del workspace, la consulta no devuelve fila y el tablero "no existe"
    /// para él.
    /// </summary>
    private async Task<BoardAccess?> QueryAccess(string userId, IQueryable<Board> boards, CancellationToken ct)
        => await boards
            .AsNoTracking()
            .SelectMany(
                b => b.Workspace!.Members.Where(m => m.UserId == userId),
                (b, m) => new BoardAccess(b.Id, b.Name, b.WorkspaceId, b.Workspace!.Name, m.Role, b.IsArchived))
            .FirstOrDefaultAsync(ct);
}
