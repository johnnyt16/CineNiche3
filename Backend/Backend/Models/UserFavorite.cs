using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.Data
{
    public class UserFavorite
    {
        [Key]
        public int favorite_id { get; set; } // Auto-incrementing primary key
        public int user_id { get; set; } // Foreign key to users table
        public string movie_id { get; set; } = null!; // Foreign key to movies table (show_id)
    }
} 