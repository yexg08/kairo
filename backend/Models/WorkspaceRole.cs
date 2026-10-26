namespace Kairo.Api.Models;

/// <summary>
/// Roles a nivel de workspace. En el MVP no hay permisos por tablero individual:
/// cualquier miembro del workspace ve todos sus tableros.
/// </summary>
public enum WorkspaceRole
{
    /// <summary>Creó el workspace. No se puede expulsar ni degradar; puede eliminarlo.</summary>
    Owner = 0,

    /// <summary>Gestiona miembros y tableros, pero no puede tocar al Owner ni borrar el workspace.</summary>
    Admin = 1,

    /// <summary>Trabaja sobre los tableros; no gestiona miembros.</summary>
    Member = 2
}
