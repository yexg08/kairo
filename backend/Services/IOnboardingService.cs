using Kairo.Api.Models;

namespace Kairo.Api.Services;

public interface IOnboardingService
{
    /// <summary>
    /// Le deja al recién registrado un workspace propio con un tablero de bienvenida. Entrar
    /// por primera vez a una pantalla completamente vacía no explica nada de la herramienta.
    /// </summary>
    Task CreateStarterWorkspaceAsync(ApplicationUser user, CancellationToken ct = default);

    /// <summary>Las columnas por defecto de un tablero nuevo.</summary>
    List<BoardList> BuildStarterLists(Guid boardId);

    /// <summary>La paleta de etiquetas por defecto de un tablero nuevo.</summary>
    List<Label> BuildStarterLabels(Guid boardId);
}
