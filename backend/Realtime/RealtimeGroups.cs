namespace Kairo.Api.Realtime;

public static class RealtimeGroups
{
    /// <summary>Grupo de SignalR con todos los clientes que tienen abierto ese tablero.</summary>
    public static string Board(Guid boardId) => $"board:{boardId}";
}
