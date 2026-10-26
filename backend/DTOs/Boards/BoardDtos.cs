using System.ComponentModel.DataAnnotations;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.DTOs.Lists;
using Kairo.Api.DTOs.Workspaces;
using Kairo.Api.Models;

namespace Kairo.Api.DTOs.Boards;

public class BoardSummaryDto
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string WorkspaceName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Background { get; set; } = "aurora";
    public bool IsArchived { get; set; }
    public int ListCount { get; set; }
    public int CardCount { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Null si el usuario nunca lo abrió. Ordena la sección "vistos recientemente".</summary>
    public DateTime? LastVisitedAt { get; set; }
}

/// <summary>Payload completo del tablero: lo que se pide al abrirlo, en una sola llamada.</summary>
public class BoardDetailDto
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string WorkspaceName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Background { get; set; } = "aurora";
    public bool IsArchived { get; set; }
    public WorkspaceRole MyRole { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<BoardListDto> Lists { get; set; } = [];
    public List<LabelDto> Labels { get; set; } = [];
    public List<WorkspaceMemberDto> Members { get; set; } = [];
}

public class CreateBoardRequest
{
    public Guid WorkspaceId { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(32)]
    public string Background { get; set; } = "aurora";

    /// <summary>
    /// Crea el tablero con "Por hacer / En progreso / Hecho" y un juego de etiquetas.
    /// Un tablero recién creado y vacío del todo no se puede ni arrastrar nada.
    /// </summary>
    public bool UseStarterTemplate { get; set; } = true;
}

public class ArchiveRequest
{
    public bool IsArchived { get; set; }
}

public class UpdateBoardRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(32)]
    public string Background { get; set; } = "aurora";
}
