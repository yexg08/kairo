namespace Kairo.Api.Models;

public class BoardList : IPositioned
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Orden dentro del tablero. Es double a propósito: al soltar una lista entre otras dos
    /// basta con guardar el punto medio de sus posiciones, sin reescribir toda la columna.
    /// </summary>
    public double Position { get; set; }

    public bool IsArchived { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
