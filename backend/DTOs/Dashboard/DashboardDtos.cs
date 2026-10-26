using Kairo.Api.DTOs.Boards;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.DTOs.Workspaces;

namespace Kairo.Api.DTOs.Dashboard;

public class DashboardDto
{
    public List<WorkspaceDto> Workspaces { get; set; } = [];
    public List<BoardSummaryDto> RecentBoards { get; set; } = [];

    /// <summary>Tarjetas asignadas al usuario, ordenadas por fecha límite.</summary>
    public List<AssignedCardDto> MyCards { get; set; } = [];

    public List<InvitationDto> PendingInvitations { get; set; } = [];

    public DashboardStatsDto Stats { get; set; } = new();
}

public class DashboardStatsDto
{
    public int WorkspaceCount { get; set; }
    public int BoardCount { get; set; }
    public int AssignedCardCount { get; set; }
    public int OverdueCardCount { get; set; }
}

public class AssignedCardDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }

    public Guid BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
    public string BoardBackground { get; set; } = "aurora";
    public string ListName { get; set; } = string.Empty;
    public string WorkspaceName { get; set; } = string.Empty;

    public List<LabelDto> Labels { get; set; } = [];
    public List<UserSummaryDto> Assignees { get; set; } = [];
}

public class CardSearchResultDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }

    public Guid BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
    public string ListName { get; set; } = string.Empty;
    public Guid WorkspaceId { get; set; }
    public string WorkspaceName { get; set; } = string.Empty;

    public List<LabelDto> Labels { get; set; } = [];
    public List<UserSummaryDto> Assignees { get; set; } = [];
}
