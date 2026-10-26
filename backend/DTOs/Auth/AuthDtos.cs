using System.ComponentModel.DataAnnotations;
using Kairo.Api.DTOs.Common;

namespace Kairo.Api.DTOs.Auth;

public class RegisterRequest
{
    [Required, MaxLength(60)]
    public string DisplayName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6), MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class RegisterResponse
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required]
    public string EmailOrUsername { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>"Mantener sesión iniciada": alarga la vigencia del token en vez de una hora.</summary>
    public bool RememberMe { get; set; }
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserSummaryDto User { get; set; } = new();
}

public class UpdateProfileRequest
{
    [Required, MaxLength(60)]
    public string DisplayName { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string AvatarColor { get; set; } = "indigo";
}
