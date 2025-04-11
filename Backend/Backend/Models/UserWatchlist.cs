using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.Data
{
    public class UserWatchlist
    {
        [Key]
        public int watchlist_id { get; set; } // Auto-incrementing primary key
        public int user_id { get; set; } // Foreign key to users table
        public string movie_id { get; set; } = null!; // Foreign key to movies table (show_id)
    }
} 