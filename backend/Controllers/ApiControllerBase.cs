using Kairo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kairo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Usuario autenticado en la petición actual.</summary>
    protected string UserId => User.GetUserId();

    protected ObjectResult Fail(int status, string message) => StatusCode(status, new { message });

    protected ObjectResult NoAccess() =>
        StatusCode(StatusCodes.Status403Forbidden, new { message = "No tienes acceso a este recurso." });

    protected NotFoundObjectResult NotFoundMessage(string message) => NotFound(new { message });
}
