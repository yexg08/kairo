namespace Kairo.Api.Models;

public class CardLabel
{
    public Guid CardId { get; set; }
    public Card? Card { get; set; }

    public Guid LabelId { get; set; }
    public Label? Label { get; set; }
}
