using CineNiche.API.Data;

namespace CineNiche.API.DTOs
{
    public class UserWatchlistDto
    {
        public int watchlist_id { get; set; }
        public int user_id { get; set; }
        public string movie_id { get; set; } = null!;

        public static UserWatchlistDto FromEntity(UserWatchlist entity)
        {
            return new UserWatchlistDto
            {
                watchlist_id = entity.watchlist_id,
                user_id = entity.user_id,
                movie_id = entity.movie_id
            };
        }
    }
} 