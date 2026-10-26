using Kairo.Api.Data;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Notifications;
using Kairo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Controllers;

[Route("api/notifications")]
public class NotificationsController(ApplicationDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<NotificationDto>>> GetMine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool unreadOnly = false)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = db.Notifications
            .AsNoTracking()
            .Include(n => n.Actor)
            .Where(n => n.UserId == UserId);

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var total = await query.CountAsync(HttpContext.RequestAborted);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(HttpContext.RequestAborted);

        return new PagedResult<NotificationDto>
        {
            Items = items.Select(n => n.ToDto()).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
        => await db.Notifications.CountAsync(
            n => n.UserId == UserId && !n.IsRead,
            HttpContext.RequestAborted);

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId, HttpContext.RequestAborted);

        if (notification is null)
        {
            return NotFoundMessage("La notificación no existe.");
        }

        notification.IsRead = true;
        await db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notifications
            .Where(n => n.UserId == UserId && !n.IsRead)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(n => n.IsRead, true),
                HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await db.Notifications
            .Where(n => n.Id == id && n.UserId == UserId)
            .ExecuteDeleteAsync(HttpContext.RequestAborted);

        return deleted == 0 ? NotFoundMessage("La notificación no existe.") : NoContent();
    }
}
