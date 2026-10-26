using Kairo.Api.Models;

namespace Kairo.Api.Services;

/// <summary>
/// Indexado fraccionario para el drag &amp; drop. Al soltar un elemento entre otros dos se le
/// asigna el punto medio de sus posiciones, así un movimiento actualiza una sola fila en vez
/// de reescribir toda la columna. Cuando de tanto partir a la mitad el hueco se vuelve
/// impracticable, se reparten las posiciones de nuevo (eso sí toca varias filas, pero pasa
/// cada muchísimos movimientos).
/// </summary>
public static class Ordering
{
    /// <summary>Separación entre elementos consecutivos al crear o al rebalancear.</summary>
    public const double Gap = 1024d;

    /// <summary>Por debajo de esto el double ya no da para seguir partiendo el hueco.</summary>
    private const double MinGap = 0.0001d;

    /// <summary>
    /// Posición para insertar en <paramref name="index"/> dentro de <paramref name="siblings"/>,
    /// que debe venir ordenado por posición y <b>sin</b> el elemento que se está moviendo.
    /// Si hace falta rebalancear, muta las posiciones de <paramref name="siblings"/>; el
    /// llamador solo tiene que guardar los cambios.
    /// </summary>
    public static double PositionAt(IList<IPositioned> siblings, int index)
    {
        var target = Math.Clamp(index, 0, siblings.Count);

        var before = target > 0 ? siblings[target - 1].Position : (double?)null;
        var after = target < siblings.Count ? siblings[target].Position : (double?)null;

        return (before, after) switch
        {
            (null, null) => Gap,
            (null, { } next) => next - Gap,
            ({ } prev, null) => prev + Gap,
            ({ } prev, { } next) when next - prev > MinGap => prev + ((next - prev) / 2),
            _ => Rebalance(siblings, target)
        };
    }

    /// <summary>Posición para añadir al final de una lista ya ordenada.</summary>
    public static double PositionAtEnd(IEnumerable<IPositioned> siblings)
    {
        var last = siblings.Select(s => s.Position).DefaultIfEmpty(0d).Max();
        return last + Gap;
    }

    /// <summary>Posición para añadir al principio de una lista ya ordenada.</summary>
    public static double PositionAtStart(IEnumerable<IPositioned> siblings)
    {
        var first = siblings.Select(s => s.Position).DefaultIfEmpty(Gap * 2).Min();
        return first - Gap;
    }

    private static double Rebalance(IList<IPositioned> siblings, int target)
    {
        for (var i = 0; i < siblings.Count; i++)
        {
            // Se dejan dos huecos por elemento para que el que entra tenga sitio propio.
            siblings[i].Position = (i + 1) * Gap * 2;
        }

        var before = target > 0 ? siblings[target - 1].Position : 0d;
        var after = target < siblings.Count ? siblings[target].Position : before + (Gap * 2);

        return before + ((after - before) / 2);
    }

    /// <summary>Ayuda a pasar de una colección concreta a la vista que espera <see cref="PositionAt"/>.</summary>
    public static IList<IPositioned> AsPositioned<T>(this IEnumerable<T> source) where T : IPositioned
        => source.Cast<IPositioned>().ToList();
}
