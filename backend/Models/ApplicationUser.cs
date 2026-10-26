using Microsoft.AspNetCore.Identity;

namespace Kairo.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Color del avatar generado al registrarse. Se guarda para que el mismo usuario
    /// se vea igual en todos los tableros, en vez de recalcularlo en cada cliente.
    /// </summary>
    public string AvatarColor { get; set; } = "indigo";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; } = new List<WorkspaceMember>();
    public ICollection<CardAssignee> AssignedCards { get; set; } = new List<CardAssignee>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
