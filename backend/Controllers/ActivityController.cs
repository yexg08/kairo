using Kairo.Api.Data;
using Kairo.Api.DTOs.Activity;
using Kairo.Api.DTOs.Common;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api")]
public class ActivityController(
    ApplicationDbContext db,
    IWorkspaceAccessService access) : ApiControllerBase
{
    [HttpGet("boards/{boardId:guid}/activity")]
    public async Task<ActionResult<PagedResult<ActivityDto>>> GetByBoard(
        Guid boardId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var boardAccess = await access.GetBoardAccessAsync(UserId, boardId, HttpContext.RequestAborted);
        if (boardAccess is null)
        {
            return NoAccess();
        }

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.ActivityLog
            .AsNoTracking()
            .Where(a => a.BoardId == boardId);

        var total = await query.CountAsync(HttpContext.RequestAborted);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new ActivityDto
            {
                Id = a.Id,
                BoardId = a.BoardId,
                Type = a.Type,
                Actor = new UserSummaryDto
                {
                    Id = a.ActorUserId,
                    DisplayName = a.Actor!.DisplayName,
                    Email = a.Actor.Email,
                    AvatarColor = a.Actor.AvatarColor
                },
                CardId = a.CardId,
                CardTitle = a.CardTitle,
                FromListName = a.FromListName,
                ToListName = a.ToListName,
                Detail = a.Detail,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(HttpContext.RequestAborted);

        return new PagedResult<ActivityDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }
}
