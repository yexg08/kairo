using Kairo.Api.Data;
using Kairo.Api.Models;

namespace Kairo.Api.Services;

public class OnboardingService(ApplicationDbContext db) : IOnboardingService
{
    private static readonly string[] StarterListNames = ["Por hacer", "En progreso", "En revisión", "Hecho"];

    private static readonly (string Name, string Color)[] StarterLabels =
    [
        ("Diseño", "violet"),
        ("Desarrollo", "sky"),
        ("Bug", "rose"),
        ("Urgente", "amber"),
        ("Mejora", "emerald")
    ];

    public List<BoardList> BuildStarterLists(Guid boardId) =>
        StarterListNames
            .Select((name, index) => new BoardList
            {
                BoardId = boardId,
                Name = name,
                Position = (index + 1) * Ordering.Gap
            })
            .ToList();

    public List<Label> BuildStarterLabels(Guid boardId) =>
        StarterLabels
            .Select(label => new Label
            {
                BoardId = boardId,
                Name = label.Name,
                Color = label.Color
            })
            .ToList();

    public async Task CreateStarterWorkspaceAsync(ApplicationUser user, CancellationToken ct = default)
    {
        var workspace = new Workspace
        {
            Name = "Mi espacio",
            Description = "Tu espacio personal. Invita a más gente cuando quieras.",
            Color = user.AvatarColor,
            CreatedByUserId = user.Id
        };

        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = user.Id,
            Role = WorkspaceRole.Owner
        });

        var board = new Board
        {
            WorkspaceId = workspace.Id,
            Name = "Bienvenido a Kairo",
            Description = "Un tablero de ejemplo para tomarle el pulso a la herramienta.",
            Background = "aurora",
            CreatedByUserId = user.Id
        };

        db.Boards.Add(board);

        var lists = BuildStarterLists(board.Id);
        var labels = BuildStarterLabels(board.Id);
        db.BoardLists.AddRange(lists);
        db.Labels.AddRange(labels);

        db.Cards.AddRange(BuildWelcomeCards(user.Id, lists, labels));

        await db.SaveChangesAsync(ct);
    }

    private static List<Card> BuildWelcomeCards(string userId, List<BoardList> lists, List<Label> labels)
    {
        var todo = lists[0];
        var inProgress = lists[1];
        var done = lists[^1];

        var design = labels.First(l => l.Name == "Diseño");
        var dev = labels.First(l => l.Name == "Desarrollo");
        var improvement = labels.First(l => l.Name == "Mejora");

        var arrastrar = NewCard(
            todo, userId, 1,
            "Arrástrame hasta \"En progreso\"",
            "Las tarjetas se mueven entre listas y se reordenan dentro de la misma lista. "
            + "Si alguien más tiene el tablero abierto, lo ve moverse al instante.");
        arrastrar.CardLabels.Add(new CardLabel { LabelId = design.Id });

        var abrir = NewCard(
            todo, userId, 2,
            "Ábreme para ver de qué va una tarjeta",
            "Dentro de cada tarjeta hay descripción, fecha límite, etiquetas, responsables, "
            + "una checklist con barra de progreso y comentarios.");
        abrir.CardLabels.Add(new CardLabel { LabelId = dev.Id });
        abrir.ChecklistItems.Add(NewChecklistItem("Marcar este ítem", 1));
        abrir.ChecklistItems.Add(NewChecklistItem("Ver cómo sube la barra de progreso", 2));
        abrir.ChecklistItems.Add(NewChecklistItem("Añadir un ítem propio", 3));

        var invitar = NewCard(
            todo, userId, 3,
            "Invita a alguien a tu espacio",
            "Desde la configuración del workspace puedes invitar gente por correo o usuario y "
            + "darle rol de Admin o Member.");
        invitar.CardLabels.Add(new CardLabel { LabelId = improvement.Id });

        var filtros = NewCard(
            inProgress, userId, 1,
            "Prueba los filtros del tablero",
            "Puedes filtrar por etiqueta, responsable o fecha límite sin salir del tablero.");

        var cuenta = NewCard(done, userId, 1, "Crear tu cuenta", null);
        cuenta.IsCompleted = true;

        return [arrastrar, abrir, invitar, filtros, cuenta];
    }

    private static Card NewCard(BoardList list, string userId, int order, string title, string? description) => new()
    {
        BoardListId = list.Id,
        Title = title,
        Description = description,
        Position = order * Ordering.Gap,
        CreatedByUserId = userId
    };

    private static ChecklistItem NewChecklistItem(string text, int order) => new()
    {
        Text = text,
        Position = order * Ordering.Gap
    };
}
