using System.Linq.Expressions;
using Kairo.Api.DTOs.Cards;
using Kairo.Api.DTOs.Common;
using Kairo.Api.DTOs.Labels;
using Kairo.Api.Models;

namespace Kairo.Api.Services;

public static class CardProjections
{
    /// <summary>
    /// Tarjeta tal como se ve en el tablero. Se define como expresión para poder pasarla a
    /// Select y que SQL Server calcule los contadores en vez de traerse checklists y
    /// comentarios enteros solo para contarlos.
    /// </summary>
    public static Expression<Func<Card, CardDto>> Summary => card => new CardDto
    {
        Id = card.Id,
        BoardListId = card.BoardListId,
        Title = card.Title,
        HasDescription = card.Description != null && card.Description != "",
        Position = card.Position,
        DueDate = card.DueDate,
        IsCompleted = card.IsCompleted,
        CoverColor = card.CoverColor,
        IsArchived = card.IsArchived,
        Labels = card.CardLabels
            .Select(cl => new LabelDto
            {
                Id = cl.Label!.Id,
                BoardId = cl.Label.BoardId,
                Name = cl.Label.Name,
                Color = cl.Label.Color
            })
            .ToList(),
        Assignees = card.Assignees
            .Select(a => new UserSummaryDto
            {
                Id = a.UserId,
                DisplayName = a.User!.DisplayName,
                Email = a.User.Email,
                AvatarColor = a.User.AvatarColor
            })
            .ToList(),
        ChecklistTotal = card.ChecklistItems.Count,
        ChecklistDone = card.ChecklistItems.Count(i => i.IsCompleted),
        CommentCount = card.Comments.Count
    };
}
