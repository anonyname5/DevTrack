using DevTrack.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMember> OrganizationMembers => Set<OrganizationMember>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(org => org.Id);
            entity.Property(org => org.Name).HasMaxLength(100).IsRequired();
            entity.HasMany(org => org.Members)
                .WithOne(member => member.Organization)
                .HasForeignKey(member => member.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(org => org.Projects)
                .WithOne(project => project.Organization)
                .HasForeignKey(project => project.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrganizationMember>(entity =>
        {
            entity.HasKey(member => member.Id);
            entity.HasIndex(member => new { member.OrganizationId, member.UserId }).IsUnique();
            entity.HasOne(member => member.User)
                .WithMany(user => user.OrganizationMembers)
                .HasForeignKey(member => member.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(inv => inv.Id);
            entity.HasIndex(inv => inv.Token).IsUnique();
            entity.Property(inv => inv.Email).HasMaxLength(255).IsRequired();
            entity.Property(inv => inv.Token).HasMaxLength(100).IsRequired();
            
            entity.HasOne(inv => inv.Organization)
                .WithMany()
                .HasForeignKey(inv => inv.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(inv => inv.InvitedByUser)
                .WithMany()
                .HasForeignKey(inv => inv.InvitedByUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(255).IsRequired();
            entity.Property(user => user.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(project => project.Id);
            entity.Property(project => project.Name).HasMaxLength(200).IsRequired();

            entity.HasOne(project => project.User)
                .WithMany(user => user.Projects)
                .HasForeignKey(project => project.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(task => task.Id);
            entity.Property(task => task.Title).HasMaxLength(200).IsRequired();

            entity.HasOne(task => task.Project)
                .WithMany(project => project.Tasks)
                .HasForeignKey(task => task.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
