using Kairo.Api.DTOs.Common;
using Kairo.Api.Models;

namespace Kairo.Api.DTOs.Activity;

public class ActivityDto
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public ActivityType Type { get; set; }
    public UserSummaryDto Actor { get; set; } = new();

    public Guid? CardId { get; set; }
    public string? CardTitle { get; set; }
    public string? FromListName { get; set; }
    public string? ToListName { get; set; }
    public string? Detail { get; set; }

    public DateTime CreatedAt { get; set; }
}
