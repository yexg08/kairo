using Kairo.Api.Services;

namespace Kairo.Api.DTOs.Common;

public class UserSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string AvatarColor { get; set; } = "indigo";

    /// <summary>
    /// Calculada, no asignada: así las consultas pueden proyectarse directo a este DTO
    /// desde SQL sin que las iniciales estorben, y el front no repite la lógica.
    /// </summary>
    public string Initials => DtoMappings.BuildInitials(DisplayName);
}
