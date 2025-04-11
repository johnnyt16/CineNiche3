using CineNiche.API.Data;
using CineNiche.API.Models;
using CineNiche.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CineNiche.API.Controllers
{
    [ApiController]
    [Route("api/recommendations")]
    public class RecommendationsController : ControllerBase
    {
        private readonly MoviesDbContext _context;
        private readonly RecommendationService _recommendationService;

        public RecommendationsController(MoviesDbContext context, RecommendationService recommendationService)
        {
            _context = context;
            _recommendationService = recommendationService;
        }

        [HttpGet("collaborative/{userId}")]
        public async Task<ActionResult<IEnumerable<MovieTitle>>> GetCollaborativeRecommendations(int userId)
        {
            var showIds = _recommendationService.GetTopCollaborativeShowIdsForUser(userId);

            if (!showIds.Any())
                return NotFound("No recommendations found for this user.");

            var movies = await _context.Movies
                .Where(m => showIds.Contains(m.show_id))
                .ToListAsync();

            return Ok(movies);
        }
    }
}
