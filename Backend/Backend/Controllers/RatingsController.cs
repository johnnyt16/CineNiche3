using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CineNiche.API.Data;
using CineNiche.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CineNiche.API.Controllers
{
    [ApiController]
    [Route("api/ratings")]
    [Authorize] // Default authorization: Require authentication
    public class RatingsController : ControllerBase
    {
        private readonly MoviesDbContext _context;
        private readonly ILogger<RatingsController> _logger;

        public RatingsController(
            MoviesDbContext context,
            ILogger<RatingsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Helper to get current user ID from token claims
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue("id");
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                _logger.LogWarning("Could not find valid 'id' claim in the authenticated user's token.");
                throw new UnauthorizedAccessException("Valid user ID not found in token claims.");
            }
            return userId;
        }

        // GET: api/ratings/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<MovieRatingDto>>> GetUserRatings(int userId)
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                // Only allow users to access their own ratings
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to access ratings for user {TargetUserId}.", currentUserId, userId);
                    return Forbid();
                }

                var ratings = await _context.Ratings
                    .Where(r => r.user_id == userId)
                    .Select(r => new MovieRatingDto
                    {
                        user_id = r.user_id,
                        show_id = r.show_id,
                        rating = r.rating ?? 0
                    })
                    .ToListAsync();

                return Ok(ratings);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized access attempt in GetUserRatings.");
                return Unauthorized(new { message = ex.Message });
            }
        }

        // POST: api/ratings
        [HttpPost]
        public async Task<ActionResult<MovieRatingDto>> AddRating([FromBody] MovieRatingDto ratingDto)
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                
                // Only allow users to add ratings for themselves
                if (ratingDto.user_id != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to add rating for user {TargetUserId}.", currentUserId, ratingDto.user_id);
                    return Forbid();
                }

                // Check if movie exists
                var movieExists = await _context.Movies.AnyAsync(m => m.show_id == ratingDto.show_id);
                if (!movieExists)
                {
                    return BadRequest(new { message = $"Movie with ID {ratingDto.show_id} not found." });
                }

                // Check if the rating already exists
                var existingRating = await _context.Ratings
                    .FirstOrDefaultAsync(r => r.user_id == ratingDto.user_id && r.show_id == ratingDto.show_id);

                if (existingRating != null)
                {
                    // Update existing rating
                    existingRating.rating = (decimal?)ratingDto.rating;
                    await _context.SaveChangesAsync();
                    return Ok(ratingDto);
                }
                else
                {
                    // Create new rating
                    var rating = new MovieRating
                    {
                        user_id = ratingDto.user_id,
                        show_id = ratingDto.show_id,
                        rating = (decimal?)ratingDto.rating
                    };

                    _context.Ratings.Add(rating);
                    await _context.SaveChangesAsync();
                    return CreatedAtAction(nameof(GetUserRatings), new { userId = ratingDto.user_id }, ratingDto);
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized access attempt in AddRating.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding rating for user {UserId}, movie {MovieId}", ratingDto?.user_id, ratingDto?.show_id);
                return StatusCode(500, "An error occurred while adding the rating.");
            }
        }

        // DELETE: api/ratings/{userId}/{movieId}
        [HttpDelete("{userId}/{movieId}")]
        public async Task<IActionResult> DeleteRating(int userId, string movieId)
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                
                // Only allow users to delete their own ratings
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to delete rating for user {TargetUserId}.", currentUserId, userId);
                    return Forbid();
                }

                var rating = await _context.Ratings
                    .FirstOrDefaultAsync(r => r.user_id == userId && r.show_id == movieId);

                if (rating == null)
                {
                    return NotFound(new { message = $"Rating for movie {movieId} by user {userId} not found." });
                }

                _context.Ratings.Remove(rating);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized access attempt in DeleteRating.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting rating for user {UserId}, movie {MovieId}", userId, movieId);
                return StatusCode(500, "An error occurred while deleting the rating.");
            }
        }
    }
} 