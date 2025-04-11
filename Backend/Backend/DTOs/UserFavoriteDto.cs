using CineNiche.API.Data;

namespace CineNiche.API.DTOs
{
    public class UserFavoriteDto
    {
        public int favorite_id { get; set; }
        public int user_id { get; set; }
        public string movie_id { get; set; } = null!;

        public static UserFavoriteDto FromEntity(UserFavorite entity)
        {
            return new UserFavoriteDto
            {
                favorite_id = entity.favorite_id,
                user_id = entity.user_id,
                movie_id = entity.movie_id
            };
        }
    }
} 