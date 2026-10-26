namespace Kairo.Api.Models;

public enum ActivityType
{
    BoardCreated = 0,
    BoardRenamed = 1,

    ListCreated = 10,
    ListRenamed = 11,
    ListMoved = 12,
    ListArchived = 13,

    CardCreated = 20,
    CardRenamed = 21,
    CardMoved = 22,
    CardDescriptionUpdated = 23,
    CardArchived = 24,
    CardDueDateSet = 25,
    CardDueDateCleared = 26,
    CardCompleted = 27,
    CardReopened = 28,

    CardAssigned = 30,
    CardUnassigned = 31,
    LabelAdded = 32,
    LabelRemoved = 33,

    ChecklistItemAdded = 40,
    ChecklistItemCompleted = 41,
    ChecklistItemReopened = 42,
    ChecklistItemRemoved = 43,

    CommentAdded = 50,

    MemberJoined = 60,
    MemberLeft = 61,
    MemberRoleChanged = 62
}

/// <summary>
/// Una línea del feed de actividad del tablero. Guarda copias del título de la tarjeta y de
/// los nombres de lista en el momento del evento: el feed debe seguir leyéndose igual aunque
/// después renombren la lista o archiven la tarjeta.
/// </summary>
public class ActivityLogEntry
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public string ActorUserId { get; set; } = string.Empty;
    public ApplicationUser? Actor { get; set; }

    public ActivityType Type { get; set; }

    public Guid? CardId { get; set; }
    public string? CardTitle { get; set; }

    public string? FromListName { get; set; }
    public string? ToListName { get; set; }

    /// <summary>Dato suelto según el tipo: nombre de etiqueta, texto del ítem, usuario afectado…</summary>
    public string? Detail { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
