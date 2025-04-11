using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;
using CineNiche.API.Data; // Add correct namespace for MoviesDbContext
using Backend.Models; // Assuming User model is here
using CineNiche.API.DTOs; // Assuming UpdateProfileDto is here
using Microsoft.Extensions.Logging;
using System;
using System.Linq;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Require authentication for all actions in this controller
    public class UsersController : ControllerBase
    {
        private readonly MoviesDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(MoviesDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            // Extract the user ID from the claims - using "id" claim key
            var userIdClaim = User.FindFirst("id")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Valid user ID not found in token claims.");
            }
            
            return userId;
        }

        // PUT /api/users/profile
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateUserProfile([FromBody] UpdateProfileDto profileData)
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                _logger.LogInformation("Attempting to update profile for User ID: {UserId}", currentUserId);

                var movieUser = await _context.Users.FindAsync(currentUserId);

                if (movieUser == null)
                {
                    _logger.LogWarning("Update profile failed: User not found for ID {UserId}", currentUserId);
                    // User claim valid but user doesn't exist in DB? Should be rare.
                    return NotFound(new { message = "User not found." });
                }

                // Convert to User model first
                var user = movieUser.ToUser();
                
                // Update user properties from DTO (only if provided)
                bool updated = false;
                if (profileData.Phone != null && user.Phone != profileData.Phone)
                {
                    user.Phone = profileData.Phone;
                    updated = true;
                }
                if (profileData.Age.HasValue && user.Age != profileData.Age)
                {
                    user.Age = profileData.Age;
                    updated = true;
                }
                if (profileData.Gender != null && user.Gender != profileData.Gender)
                {
                    user.Gender = profileData.Gender;
                    updated = true;
                }
                if (profileData.City != null && user.City != profileData.City)
                {
                    user.City = profileData.City;
                    updated = true;
                }
                if (profileData.State != null && user.State != profileData.State)
                {
                    user.State = profileData.State;
                    updated = true;
                }

                if (updated)
                {
                    // Convert back to MovieUser and update in database
                    movieUser.phone = user.Phone ?? string.Empty;
                    movieUser.age = user.Age ?? 0;
                    movieUser.gender = user.Gender ?? string.Empty;
                    movieUser.city = user.City ?? string.Empty;
                    movieUser.state = user.State ?? string.Empty;
                    
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully updated profile for User ID: {UserId}", currentUserId);
                }
                else
                {
                    _logger.LogInformation("No profile changes detected for User ID: {UserId}", currentUserId);
                }

                // Return success (No Content or Ok with updated profile DTO)
                return NoContent(); // 204 No Content is suitable for successful PUT
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized profile update attempt.");
                 return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for User ID: {UserId}", GetCurrentUserId()); // Careful calling GetCurrentUserId here
                return StatusCode(500, new { message = "An error occurred while updating the profile." });
            }
        }

        // Optional: GET /api/users/profile to retrieve current user's profile
        [HttpGet("profile")]
        public async Task<ActionResult<MovieUserDto>> GetUserProfile()
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                var movieUser = await _context.Users.FindAsync(currentUserId);

                if (movieUser == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                // Convert MovieUser to DTO using extension method
                var userDto = new MovieUserDto
                {
                    Id = movieUser.user_id,
                    Name = movieUser.name,
                    Email = movieUser.email,
                    Phone = movieUser.phone,
                    Age = movieUser.age,
                    Gender = movieUser.gender,
                    City = movieUser.city,
                    State = movieUser.state,
                    IsAdmin = movieUser.isAdmin == 1
                };
                
                return Ok(userDto);
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized profile get attempt.");
                 return Unauthorized(new { message = ex.Message });
            }
             catch (Exception ex)
            {
                 _logger.LogError(ex, "Error retrieving profile for User ID: {UserId}", GetCurrentUserId());
                 return StatusCode(500, new { message = "An error occurred while retrieving the profile." });
            }
        }
    }
} 