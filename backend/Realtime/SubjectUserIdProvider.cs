using Kairo.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace Kairo.Api.Realtime;

/// <summary>
/// SignalR busca por defecto el claim NameIdentifier para saber a quién pertenece una
/// conexión. Aquí los tokens llevan el id en "sub" (sin mapeo automático de claims), así que
/// se lo indicamos explícitamente; de esto depende que Clients.User(...) entregue.
/// </summary>
public class SubjectUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.GetUserId();
}
