using Microsoft.EntityFrameworkCore;

namespace CineNiche.API.Data
{
    public class MoviesDbContext : DbContext
    {
        public MoviesDbContext(DbContextOptions<MoviesDbContext> options) : base(options)
        {
        }

        public DbSet<MovieTitle> Movies { get; set; }
        public DbSet<MovieRating> Ratings { get; set; }
        public DbSet<MovieUser> Users { get; set; }
        public DbSet<UserFavorite> Favorites { get; set; }
        public DbSet<UserWatchlist> Watchlist { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Map entities to their actual table names
            modelBuilder.Entity<MovieTitle>().ToTable("movies_titles");
            modelBuilder.Entity<MovieRating>().ToTable("movies_ratings");
            modelBuilder.Entity<MovieUser>().ToTable("movies_users");
            modelBuilder.Entity<UserFavorite>().ToTable("user_favorites");
            modelBuilder.Entity<UserWatchlist>().ToTable("user_watchlist");

            // Configure primary keys
            modelBuilder.Entity<MovieRating>()
                .HasKey(r => new { r.user_id, r.show_id });
    
            // Configure required fields
            modelBuilder.Entity<MovieTitle>()
                .Property(m => m.show_id)
                .IsRequired();
    
            /*// Configure default values for booleans if needed
            modelBuilder.Entity<MovieTitle>()
                .Property(m => m.osAction)
                .HasDefaultValue(false);*/
        }
    }
}