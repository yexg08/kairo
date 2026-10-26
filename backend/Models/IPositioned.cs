namespace Kairo.Api.Models;

/// <summary>Todo lo que el usuario puede reordenar arrastrando.</summary>
public interface IPositioned
{
    double Position { get; set; }
}
