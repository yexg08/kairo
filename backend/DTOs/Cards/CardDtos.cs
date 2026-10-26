using System.ComponentModel.DataAnnotations;
using Kairo.Api.DTOs.Checklist;
using Kairo.Api.DTOs.Comments;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;

namespace Kairo.Api.DTOs.Cards;

/// <summary>Lo que se ve de una tarjeta sin abrirla: contadores en vez de colecciones completas.</summary>
public class CardDto
{
    public Guid Id { get; set; }
    public Guid BoardListId { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool HasDescription { get; set; }
    public double Position { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public string? CoverColor { get; set; }
    public bool IsArchived { get; set; }

    public List<LabelDto> Labels { get; set; } = [];
    public List<UserSummaryDto> Assignees { get; set; } = [];

    public int ChecklistTotal { get; set; }
    public int ChecklistDone { get; set; }
    public int CommentCount { get; set; }
}

public class CardDetailDto : CardDto
{
    public string? Description { get; set; }
    public UserSummaryDto? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Guid BoardId { get; set; }
    public string ListName { get; set; } = string.Empty;

    public List<ChecklistItemDto> ChecklistItems { get; set; } = [];
    public List<CommentDto> Comments { get; set; } = [];
}

public class CreateCardRequest
{
    public Guid BoardListId { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>Si es true la tarjeta se inserta arriba del todo en vez de al final.</summary>
    public bool AtTop { get; set; }
}

public class UpdateCardRequest
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(8000)]
    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }

    [MaxLength(32)]
    public string? CoverColor { get; set; }
}

public class MoveCardRequest
{
    public Guid TargetListId { get; set; }

    /// <summary>Índice destino dentro de la lista de llegada (0 = arriba del todo).</summary>
    [Range(0, int.MaxValue)]
    public int NewIndex { get; set; }
}

public class CardAssigneeRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
}
