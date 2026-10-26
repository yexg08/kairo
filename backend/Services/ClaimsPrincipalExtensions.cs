using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Kairo.Api.Services;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Id del usuario tal como viaja en el token. Se lee "sub" directamente porque el
    /// middleware está configurado sin el mapeo automático de claims: lo que se firma es
    /// exactamente lo que se lee.
    /// </summary>
    public static string GetUserId(this ClaimsPrincipal principal)
        => principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
           ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? throw new InvalidOperationException("El token no trae el id del usuario.");

    public static string? GetDisplayName(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimNames.DisplayName);
}
