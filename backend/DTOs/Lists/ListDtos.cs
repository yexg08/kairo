using System.ComponentModel.DataAnnotations;
using Kairo.Api.DTOs.Cards;

namespace Kairo.Api.DTOs.Lists;

public class BoardListDto
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Position { get; set; }
    public bool IsArchived { get; set; }
    public List<CardDto> Cards { get; set; } = [];
}

public class CreateListRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class UpdateListRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class MoveListRequest
{
    /// <summary>
    /// Índice destino dentro del tablero (0 = primera). El cliente razona en índices, que es
    /// lo que le da el CDK al soltar; la posición fraccionaria la calcula el servidor.
    /// </summary>
    [Range(0, int.MaxValue)]
    public int NewIndex { get; set; }
}
