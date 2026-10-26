using Kairo.Api.Models;

namespace Kairo.Api.Services;

public interface ITokenService
{
    Task<(string Token, DateTime ExpiresAt)> CreateTokenAsync(ApplicationUser user, bool rememberMe);
}
