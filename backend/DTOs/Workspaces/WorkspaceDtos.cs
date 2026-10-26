using System.ComponentModel.DataAnnotations;
using Kairo.Api.Models;
using Kairo.Api.Services;

namespace Kairo.Api.DTOs.Workspaces;

public class WorkspaceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "indigo";

    /// <summary>Rol del usuario que hace la petición dentro de este workspace.</summary>
    public WorkspaceRole MyRole { get; set; }

    public int MemberCount { get; set; }
    public int BoardCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateWorkspaceRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(32)]
    public string Color { get; set; } = "indigo";
}

public class UpdateWorkspaceRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(32)]
    public string Color { get; set; } = "indigo";
}

public class WorkspaceMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string AvatarColor { get; set; } = "indigo";
    public string Initials => DtoMappings.BuildInitials(DisplayName);
    public WorkspaceRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class InviteMemberRequest
{
    [Required, MaxLength(256)]
    public string EmailOrUsername { get; set; } = string.Empty;

    public WorkspaceRole Role { get; set; } = WorkspaceRole.Member;
}

public class UpdateMemberRoleRequest
{
    public WorkspaceRole Role { get; set; }
}

public class InvitationDto
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string WorkspaceName { get; set; } = string.Empty;
    public string WorkspaceColor { get; set; } = "indigo";
    public string InvitedByName { get; set; } = string.Empty;

    // Quién fue invitado: lo que se lista en la configuración del espacio.
    public string InvitedUserName { get; set; } = string.Empty;
    public string? InvitedUserEmail { get; set; }
    public string InvitedUserAvatarColor { get; set; } = "indigo";

    public WorkspaceRole Role { get; set; }
    public InvitationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
