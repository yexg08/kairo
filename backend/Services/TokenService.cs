using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Kairo.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Kairo.Api.Services;

public class TokenService(IConfiguration configuration) : ITokenService
{
    public Task<(string Token, DateTime ExpiresAt)> CreateTokenAsync(ApplicationUser user, bool rememberMe)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var key = jwtSection["Key"]
            ?? throw new InvalidOperationException("Falta configurar Jwt:Key en appsettings.");

        // Sin "mantener sesión iniciada" el token caduca en un par de horas y hay que volver
        // a entrar; con él, dura lo suficiente como para que solo se cierre sesión a mano.
        var expiryMinutes = rememberMe
            ? int.Parse(jwtSection["RememberMeExpiryDays"] ?? "365") * 24 * 60
            : int.Parse(jwtSection["ExpiryMinutes"] ?? "120");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimNames.DisplayName, user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return Task.FromResult((new JwtSecurityTokenHandler().WriteToken(token), expiresAt));
    }
}

public static class ClaimNames
{
    public const string DisplayName = "displayName";
}
