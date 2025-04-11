namespace CineNiche.API.Models
{
    public class CollaborativeRecommendation
    {
        public int UserId { get; set; }
        public string ShowId { get; set; }
        public double PredictedRating { get; set; }
    }
}
