using Kairo.Api.Data;
using Kairo.Api.DTOs.Auth;
using Kairo.Api.DTOs.Common;
using Kairo.Api.Models;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

public class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    IOnboardingService onboarding,
    ApplicationDbContext db) : ApiControllerBase
{
    /// <summary>Colores de avatar disponibles; se reparte uno estable a partir del correo.</summary>
    private static readonly string[] AvatarColors =
        ["indigo", "violet", "sky", "emerald", "amber", "rose", "teal", "fuchsia"];

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return Conflict(new { message = "Ya existe una cuenta con ese correo." });
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            AvatarColor = PickAvatarColor(email)
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        await onboarding.CreateStarterWorkspaceAsync(user, HttpContext.RequestAborted);

        // Sin auto-login: la cuenta queda creada y el usuario entra explícitamente después.
        return new RegisterResponse
        {
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName
        };
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var identifier = request.EmailOrUsername.Trim();

        var user = await userManager.FindByEmailAsync(identifier)
            ?? await userManager.FindByNameAsync(identifier);

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Correo o contraseña incorrectos." });
        }

        var (token, expiresAt) = await tokenService.CreateTokenAsync(user, request.RememberMe);

        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = user.ToSummary()
        };
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserSummaryDto>> Me()
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == UserId, HttpContext.RequestAborted);

        return user is null
            ? NotFoundMessage("La cuenta ya no existe.")
            : user.ToSummary();
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserSummaryDto>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == UserId, HttpContext.RequestAborted);
        if (user is null)
        {
            return NotFoundMessage("La cuenta ya no existe.");
        }

        user.DisplayName = request.DisplayName.Trim();
        user.AvatarColor = AvatarColors.Contains(request.AvatarColor) ? request.AvatarColor : user.AvatarColor;

        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return user.ToSummary();
    }

    /// <summary>
    /// Determinista a partir del correo: el mismo usuario mantiene su color aunque se
    /// vuelva a crear la base, y dos cuentas distintas rara vez coinciden.
    /// </summary>
    private static string PickAvatarColor(string email)
    {
        var hash = email.Aggregate(17, (current, c) => (current * 31) + c);
        return AvatarColors[Math.Abs(hash) % AvatarColors.Length];
    }
}
