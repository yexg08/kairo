using System.ComponentModel.DataAnnotations;
using Kairo.Api.DTOs.Common;

namespace Kairo.Api.DTOs.Comments;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public UserSummaryDto Author { get; set; } = new();
}

public class CreateCommentRequest
{
    [Required, MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
}

public class UpdateCommentRequest
{
    [Required, MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
}
