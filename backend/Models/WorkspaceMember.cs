namespace Kairo.Api.Models;

public class WorkspaceMember
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public WorkspaceRole Role { get; set; } = WorkspaceRole.Member;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
