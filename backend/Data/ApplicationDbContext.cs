using Kairo.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Kairo.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<WorkspaceInvitation> WorkspaceInvitations => Set<WorkspaceInvitation>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardList> BoardLists => Set<BoardList>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<Label> Labels => Set<Label>();
    public DbSet<CardLabel> CardLabels => Set<CardLabel>();
    public DbSet<CardAssignee> CardAssignees => Set<CardAssignee>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<ActivityLogEntry> ActivityLog => Set<ActivityLogEntry>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<BoardVisit> BoardVisits => Set<BoardVisit>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Los nombres AspNet* que trae Identity, renombrados a algo más legible en SSMS.
        builder.Entity<ApplicationUser>().ToTable("Users");
        builder.Entity<IdentityRole>().ToTable("Roles");
        builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.DisplayName).HasMaxLength(60).IsRequired();
            entity.Property(u => u.AvatarColor).HasMaxLength(32).IsRequired();
        });

        builder.Entity<Workspace>(entity =>
        {
            entity.Property(w => w.Name).HasMaxLength(80).IsRequired();
            entity.Property(w => w.Description).HasMaxLength(500);
            entity.Property(w => w.Color).HasMaxLength(32).IsRequired();

            entity.HasOne(w => w.CreatedBy)
                .WithMany()
                .HasForeignKey(w => w.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<WorkspaceMember>(entity =>
        {
            entity.HasIndex(m => new { m.WorkspaceId, m.UserId }).IsUnique();

            entity.HasOne(m => m.Workspace)
                .WithMany(w => w.Members)
                .HasForeignKey(m => m.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.User)
                .WithMany(u => u.WorkspaceMemberships)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<WorkspaceInvitation>(entity =>
        {
            entity.HasIndex(i => new { i.WorkspaceId, i.InvitedUserId, i.Status });

            entity.HasOne(i => i.Workspace)
                .WithMany(w => w.Invitations)
                .HasForeignKey(i => i.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.InvitedUser)
                .WithMany()
                .HasForeignKey(i => i.InvitedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.InvitedBy)
                .WithMany()
                .HasForeignKey(i => i.InvitedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Board>(entity =>
        {
            entity.Property(b => b.Name).HasMaxLength(100).IsRequired();
            entity.Property(b => b.Description).HasMaxLength(1000);
            entity.Property(b => b.Background).HasMaxLength(32).IsRequired();

            entity.HasIndex(b => new { b.WorkspaceId, b.IsArchived });

            entity.HasOne(b => b.Workspace)
                .WithMany(w => w.Boards)
                .HasForeignKey(b => b.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(b => b.CreatedBy)
                .WithMany()
                .HasForeignKey(b => b.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<BoardList>(entity =>
        {
            entity.Property(l => l.Name).HasMaxLength(100).IsRequired();

            entity.HasIndex(l => new { l.BoardId, l.Position });

            entity.HasOne(l => l.Board)
                .WithMany(b => b.Lists)
                .HasForeignKey(l => l.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Card>(entity =>
        {
            entity.Property(c => c.Title).HasMaxLength(200).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(8000);
            entity.Property(c => c.CoverColor).HasMaxLength(32);

            entity.HasIndex(c => new { c.BoardListId, c.Position });
            entity.HasIndex(c => c.DueDate);

            entity.HasOne(c => c.BoardList)
                .WithMany(l => l.Cards)
                .HasForeignKey(c => c.BoardListId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.CreatedBy)
                .WithMany()
                .HasForeignKey(c => c.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Label>(entity =>
        {
            entity.Property(l => l.Name).HasMaxLength(50).IsRequired();
            entity.Property(l => l.Color).HasMaxLength(32).IsRequired();

            entity.HasIndex(l => l.BoardId);

            entity.HasOne(l => l.Board)
                .WithMany(b => b.Labels)
                .HasForeignKey(l => l.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CardLabel>(entity =>
        {
            entity.HasKey(cl => new { cl.CardId, cl.LabelId });

            entity.HasOne(cl => cl.Card)
                .WithMany(c => c.CardLabels)
                .HasForeignKey(cl => cl.CardId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict y no Cascade: Board ya llega en cascada a CardLabels vía
            // BoardList -> Card, y SQL Server rechaza dos caminos de borrado a la misma
            // tabla. Al eliminar una etiqueta, LabelsController borra sus filas a mano.
            entity.HasOne(cl => cl.Label)
                .WithMany(l => l.CardLabels)
                .HasForeignKey(cl => cl.LabelId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CardAssignee>(entity =>
        {
            entity.HasKey(ca => new { ca.CardId, ca.UserId });

            entity.HasOne(ca => ca.Card)
                .WithMany(c => c.Assignees)
                .HasForeignKey(ca => ca.CardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.User)
                .WithMany(u => u.AssignedCards)
                .HasForeignKey(ca => ca.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ChecklistItem>(entity =>
        {
            entity.Property(i => i.Text).HasMaxLength(300).IsRequired();

            entity.HasIndex(i => new { i.CardId, i.Position });

            entity.HasOne(i => i.Card)
                .WithMany(c => c.ChecklistItems)
                .HasForeignKey(i => i.CardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Comment>(entity =>
        {
            entity.Property(c => c.Text).HasMaxLength(2000).IsRequired();

            entity.HasIndex(c => new { c.CardId, c.CreatedAt });

            entity.HasOne(c => c.Card)
                .WithMany(card => card.Comments)
                .HasForeignKey(c => c.CardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ActivityLogEntry>(entity =>
        {
            entity.Property(a => a.CardTitle).HasMaxLength(200);
            entity.Property(a => a.FromListName).HasMaxLength(100);
            entity.Property(a => a.ToListName).HasMaxLength(100);
            entity.Property(a => a.Detail).HasMaxLength(300);

            entity.HasIndex(a => new { a.BoardId, a.CreatedAt });

            entity.HasOne(a => a.Board)
                .WithMany(b => b.Activity)
                .HasForeignKey(a => a.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Actor)
                .WithMany()
                .HasForeignKey(a => a.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.WorkspaceName).HasMaxLength(80);
            entity.Property(n => n.BoardName).HasMaxLength(100);
            entity.Property(n => n.CardTitle).HasMaxLength(200);
            entity.Property(n => n.Detail).HasMaxLength(300);

            entity.HasIndex(n => new { n.UserId, n.IsRead });
            entity.HasIndex(n => new { n.UserId, n.CreatedAt });

            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(n => n.Actor)
                .WithMany()
                .HasForeignKey(n => n.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // WorkspaceId / BoardId / CardId / InvitationId quedan como columnas sueltas,
            // sin FK: una notificación tiene que sobrevivir a que borren el tablero al que
            // apunta (se muestra igual gracias a los nombres copiados aquí).
        });

        builder.Entity<BoardVisit>(entity =>
        {
            entity.HasKey(v => new { v.BoardId, v.UserId });

            entity.HasIndex(v => new { v.UserId, v.VisitedAt });

            entity.HasOne(v => v.Board)
                .WithMany(b => b.Visits)
                .HasForeignKey(v => v.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.User)
                .WithMany()
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
