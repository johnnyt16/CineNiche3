namespace CineNiche.API.DTOs
{
    public class MovieRatingDto
    {
        public int user_id { get; set; }
        public string show_id { get; set; } = null!;
        public decimal rating { get; set; }
        public string? review { get; set; }
    }
} 