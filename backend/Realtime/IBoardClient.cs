using Kairo.Api.DTOs.Activity;
using Kairo.Api.DTOs.Cards;
using Kairo.Api.DTOs.Comments;
using Kairo.Api.DTOs.Lists;
using Kairo.Api.DTOs.Notifications;

namespace Kairo.Api.Realtime;

/// <summary>
/// Contrato de los eventos que el servidor empuja al cliente. Al tipar el hub con esta
/// interfaz los nombres de los eventos dejan de ser strings sueltos y el compilador avisa
/// si alguno se renombra a medias.
/// </summary>
public interface IBoardClient
{
    Task CardCreated(CardDto card);
    Task CardUpdated(CardDto card);
    Task CardMoved(CardMovedEvent payload);
    Task CardArchived(CardArchivedEvent payload);

    Task ListCreated(BoardListDto list);
    Task ListRenamed(ListRenamedEvent payload);
    Task ListMoved(ListMovedEvent payload);
    Task ListArchived(ListArchivedEvent payload);

    Task BoardInfoChanged(BoardInfoChangedEvent payload);
    Task BoardLabelsChanged(BoardLabelsChangedEvent payload);

    Task CommentAdded(CommentDto comment);
    Task CommentUpdated(CommentDto comment);
    Task CommentDeleted(CommentDeletedEvent payload);

    Task ChecklistChanged(ChecklistChangedEvent payload);

    Task ActivityAdded(ActivityDto activity);
    Task PresenceChanged(BoardPresenceEvent payload);

    /// <summary>Va al grupo personal del usuario, no al del tablero.</summary>
    Task NotificationReceived(NotificationDto notification);
}
