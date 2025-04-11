using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CineNiche.API.Data;
using CineNiche.API.DTOs;
using CineNiche.API.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims; // Add for ClaimsPrincipal extension methods
using CineNiche.API.Validation;
using Microsoft.Data.Sqlite; // Add for SqliteException
using System.IO; // Explicit import
using IOFile = System.IO.File; // Add alias for System.IO.File

namespace CineNiche.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Default authorization: Require authentication
    public class MoviesController : ControllerBase
    {
        private readonly MoviesDbContext _context;
        private readonly RecommendationService _recommendationService;
        private readonly ILogger<MoviesController> _logger; // Add logger

        public MoviesController(
            MoviesDbContext context,
            RecommendationService recommendationService,
            ILogger<MoviesController> logger) // Inject logger
        {
            _context = context;
            _recommendationService = recommendationService;
            _logger = logger; // Assign logger
        }

        // Helper to get current user ID from token claims
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue("id"); // Use extension method
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                // This case should ideally not happen if [Authorize] is working,
                // but good practice to handle it.
                _logger.LogWarning("Could not find valid 'id' claim in the authenticated user's token.");
                throw new UnauthorizedAccessException("Valid user ID not found in token claims.");
            }
            return userId;
        }

        // Allow Anonymous access explicitly if needed for specific endpoints
        [HttpGet("titles")]
        [AllowAnonymous] // Allow anyone to get the main list of titles
        public async Task<ActionResult<List<MovieTitleDto>>> GetMovieTitles()
        {
            try
            {
                _logger.LogInformation("GetMovieTitles: Starting database query");
                
                // First check if we can access the database at all
                if (_context.Database.CanConnect())
                {
                    _logger.LogInformation("Database connection successful");
                }
                else
                {
                    _logger.LogError("Cannot connect to database");
                    return StatusCode(500, new { message = "Database connection failed", detail = "Check database path and permissions" });
                }
                
                // Check if the Movies table exists and has data
                try
                {
                    var count = await _context.Movies.CountAsync();
                    _logger.LogInformation($"Movies table contains {count} records");
                }
                catch (Exception tableEx)
                {
                    _logger.LogError(tableEx, "Error accessing Movies table");
                    return StatusCode(500, new { message = "Error accessing Movies table", detail = tableEx.Message });
                }
                
                var movies = await _context.Movies  
                    .OrderBy(m => m.title ?? string.Empty)
                    .ToListAsync();
                
                _logger.LogInformation($"GetMovieTitles: Retrieved {movies.Count} movies from database");
                
                var movieDtos = movies.Select(m => MovieTitleDto.FromEntity(m)).ToList();
                return Ok(movieDtos);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database update error fetching movie titles");
                return StatusCode(500, new { message = "A database error occurred", detail = dbEx.InnerException?.Message });
            }
            catch (SqliteException sqlEx)
            {
                _logger.LogError(sqlEx, "SQLite error fetching movie titles");
                return StatusCode(500, new { message = "A SQLite database error occurred", detail = sqlEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all movie titles: {Message}", ex.Message);
                return StatusCode(500, new { message = "An error occurred while fetching movies", detail = ex.Message });
            }
        }

        [HttpGet("titles/paged")]
        [AllowAnonymous] // Example: Allow anyone to get paged titles
        public async Task<ActionResult<object>> GetMovieTitlesPaged(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20,
            [FromQuery] string? genre = null, // Add genre parameter
            [FromQuery] string? type = null,   // Add type parameter (maps to contentType)
            [FromQuery] string? sortBy = null)  // Add sortBy parameter
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;
            
            // Start building the query
            IQueryable<MovieTitle> query = _context.Movies;
            
            // Apply filters if provided
            if (!string.IsNullOrEmpty(genre) && genre != "All Genres")
            {
                _logger.LogInformation("Applying genre filter: {Genre}", genre);
                // Filter based on boolean genre flags
                switch (genre.Trim().ToLower())
                {
                    case "action":
                        query = query.Where(m => m.Action == true || m.TV_Action == true);
                        break;
                    case "adventure":
                        query = query.Where(m => m.Adventure == true);
                        break;
                    case "anime": // Assuming "Anime Series" maps here
                    case "anime series":
                        query = query.Where(m => m.Anime_Series_International_TV_Shows == true);
                        break;
                    case "children": // Combine Children & Kids?
                    case "kids":
                        query = query.Where(m => m.Children == true || m.Kids_TV == true);
                        break;
                    case "comedy": // Combine Comedies & TV Comedies
                    case "comedies":
                        query = query.Where(m => m.Comedies == true || m.TV_Comedies == true || m.Comedies_International_Movies == true || m.Comedies_Romantic_Movies == true || m.Comedies_Dramas_International_Movies == true || m.Talk_Shows_TV_Comedies == true);
                        break;
                    case "crime": // Assuming maps to Crime TV
                        query = query.Where(m => m.Crime_TV_Shows_Docuseries == true);
                        break;
                    case "documentary":
                    case "documentaries":
                        query = query.Where(m => m.Documentaries == true || m.Documentaries_International_Movies == true);
                        break;
                    case "docuseries": // Note: User mentioned only on TV shows
                        query = query.Where(m => m.Docuseries == true || m.Crime_TV_Shows_Docuseries == true || m.British_TV_Shows_Docuseries_International_TV_Shows == true);
                        break;
                    case "drama":
                    case "dramas":
                        query = query.Where(m => m.Dramas == true || m.TV_Dramas == true || m.Dramas_International_Movies == true || m.Dramas_Romantic_Movies == true || m.Comedies_Dramas_International_Movies == true || m.International_TV_Shows_Romantic_TV_Shows_TV_Dramas == true);
                        break;
                    case "family":
                        query = query.Where(m => m.Family_Movies == true);
                        break;
                    case "fantasy":
                        query = query.Where(m => m.Fantasy == true);
                        break;
                    case "horror":
                        query = query.Where(m => m.Horror_Movies == true);
                        break;
                    case "international": // Catch-all for flags containing 'International'
                        query = query.Where(m => m.Anime_Series_International_TV_Shows == true || m.British_TV_Shows_Docuseries_International_TV_Shows == true || m.Comedies_International_Movies == true || m.Documentaries_International_Movies == true || m.Dramas_International_Movies == true || m.International_Movies_Thrillers == true || m.International_TV_Shows_Romantic_TV_Shows_TV_Dramas == true || m.Comedies_Dramas_International_Movies == true);
                        break;
                    case "musicals":
                        query = query.Where(m => m.Musicals == true);
                        break;
                    case "nature":
                        query = query.Where(m => m.Nature_TV == true);
                        break;
                    case "reality tv":
                    case "reality":
                        query = query.Where(m => m.Reality_TV == true);
                        break;
                    case "romance": // Combine Romance/Romantic
                    case "romantic comedies":
                        query = query.Where(m => m.Comedies_Romantic_Movies == true || m.Dramas_Romantic_Movies == true || m.International_TV_Shows_Romantic_TV_Shows_TV_Dramas == true);
                        break;
                    case "spirituality":
                        query = query.Where(m => m.Spirituality == true);
                        break;
                    case "talk shows":
                        query = query.Where(m => m.Talk_Shows_TV_Comedies == true);
                        break;
                    case "thrillers":
                    case "thriller":
                        query = query.Where(m => m.Thrillers == true || m.International_Movies_Thrillers == true);
                        break;
                    case "language": // Language_TV_Shows seems specific
                        query = query.Where(m => m.Language_TV_Shows == true);
                        break;
                    // Add other cases as needed based on the boolean flags
                    default:
                        _logger.LogWarning("Unsupported genre filter received: {Genre}", genre);
                        // Optional: Decide whether to ignore the filter or return bad request
                        break;
                }
            }

            if (!string.IsNullOrEmpty(type) && type != "All Types")
            {
                // Assuming the 'type' column/property stores Movie/TV Series
                query = query.Where(m => m.type != null && m.type.ToLower() == type.ToLower());
                 _logger.LogInformation("Applying type filter: {Type}", type);
            }
            
            // Calculate total count and pages based on the FILTERED query
            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            _logger.LogInformation("Filtered count: {Count}, Total Pages: {Pages}", totalCount, totalPages);
            
            // Apply sorting based on sortBy parameter
            IOrderedQueryable<MovieTitle> orderedQuery;
            if (sortBy != null && sortBy.Equals("id", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Applying sorting by ID (show_id)");
                orderedQuery = query.OrderBy(m => m.show_id);
            }
            else
            {
                _logger.LogInformation("Applying default sorting by title");
                orderedQuery = query.OrderBy(m => m.title ?? string.Empty);
            }
            
            // Apply pagination to the ORDERED query
            var movies = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            var movieDtos = movies.Select(m => MovieTitleDto.FromEntity(m)).ToList();
            
            return Ok(new {
                movies = movieDtos,
                pagination = new {
                    currentPage = page,
                    pageSize = pageSize,
                    totalPages = totalPages, // Based on filtered count
                    totalCount = totalCount, // Based on filtered count
                    hasNext = page < totalPages,
                    hasPrevious = page > 1
                }
            });
        }

        [HttpGet("titles/{id}")]
        [AllowAnonymous] // Example: Allow anyone to get details for a specific title
        public async Task<ActionResult<MovieTitleDto>> GetMovieTitle(string id)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound();
            
            return Ok(MovieTitleDto.FromEntity(movie));
        }

        [HttpGet("titles/{id}/recommendations")]
        [AllowAnonymous] // Example: Allow anyone to get recommendations (user ID is optional query param)
        public async Task<ActionResult<List<MovieTitleDto>>> GetMovieRecommendations(string id, [FromQuery] int? userId)
        {
            var recommendations = await _recommendationService.GetHybridRecommendations(id, userId);
            var dtos = recommendations.Select(m => MovieTitleDto.FromEntity(m)).ToList();
            return Ok(dtos);
        }

        [HttpGet("users")]
        [Authorize(Roles = "Admin")] // Restrict to Admins
        public async Task<ActionResult<List<MovieUserDto>>> GetUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.name ?? string.Empty)
                .ToListAsync();
            
            var userDtos = users.Select(u => new MovieUserDto
            {
                Id = u.user_id,
                Name = u.name,
                Email = u.email,
                Phone = u.phone,
                Age = u.age,
                Gender = u.gender,
                City = u.city,
                State = u.state,
                IsAdmin = u.isAdmin == 1
            }).ToList();
            
            return Ok(userDtos);
        }

        [HttpGet("users/{id}")]
        [Authorize(Roles = "Admin")] // Restrict to Admins
        public async Task<ActionResult<MovieUserDto>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            
            var userDto = new MovieUserDto
            {
                Id = user.user_id,
                Name = user.name,
                Email = user.email,
                Phone = user.phone,
                Age = user.age,
                Gender = user.gender,
                City = user.city,
                State = user.state,
                IsAdmin = user.isAdmin == 1
            };
            
            return Ok(userDto);
        }
        
        [HttpGet("ratings/{showId}")]
        public async Task<ActionResult<List<MovieRatingDto>>> GetRatingsForMovie(string showId)
        {
            var ratings = await _context.Ratings
                .Where(r => r.show_id == showId)
                .Select(r => new MovieRatingDto
                {
                    user_id = r.user_id,
                    show_id = r.show_id,
                    rating = r.rating ?? 0
                })
                .ToListAsync();
                
            return Ok(ratings);
        }
        
        [HttpGet("ratings/user/{userId}")]
        public async Task<ActionResult<List<MovieRatingDto>>> GetUserRatings(int userId)
        {
            // Secure: Check if the requesting user is the target user
            try
            {
                int currentUserId = GetCurrentUserId();
                // REMOVED Admin check: Admins should use different tools if needed
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to access ratings for user {TargetUserId}.", currentUserId, userId);
                    return Forbid(); // 403 Forbidden
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
        
        [HttpGet("ratings/average/{showId}")]
        [AllowAnonymous] // Example: Allow anyone to get average rating
        public async Task<ActionResult<double>> GetAverageRating(string showId)
        {
            var ratings = await _context.Ratings
                .Where(r => r.show_id == showId && r.rating.HasValue)
                .Select(r => r.rating!.Value)
                .ToListAsync();
                
            if (!ratings.Any())
            {
                return Ok(0.0);
            }
            
            return Ok(ratings.Average());
        }
        
        // Favorites endpoints
        [HttpGet("favorites/user/{userId}")]
        public async Task<ActionResult<List<UserFavoriteDto>>> GetUserFavorites(int userId)
        {
             // Secure: Check if the requesting user is the target user
            try
            {
                int currentUserId = GetCurrentUserId();
                 // REMOVED Admin check: Admins should use different tools if needed
                if (userId != currentUserId)
                {
                     _logger.LogWarning("User {CurrentUserId} attempted to access favorites for user {TargetUserId}.", currentUserId, userId);
                    return Forbid(); 
                }
                var favorites = await _context.Favorites
                    .Where(f => f.user_id == userId)
                    .Select(f => UserFavoriteDto.FromEntity(f))
                    .ToListAsync();
                return Ok(favorites);
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in GetUserFavorites.");
                 return Unauthorized(new { message = ex.Message });
            }
        }
        
        [HttpPost("favorites")]
        public async Task<ActionResult<UserFavoriteDto>> AddFavorite([FromBody] UserFavoriteDto favoriteDto)
        {
            // Secure: Check if the DTO's user ID matches the authenticated user
            try
            {
                int currentUserId = GetCurrentUserId();
                // REMOVED Admin check
                if (favoriteDto.user_id != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to add favorite for user {TargetUserId}.", currentUserId, favoriteDto.user_id);
                    return Forbid();
                }

                // Check if movie exists (optional but good practice)
                var movieExists = await _context.Movies.AnyAsync(m => m.show_id == favoriteDto.movie_id);
                if (!movieExists)
                {
                    return BadRequest(new { message = $"Movie with ID {favoriteDto.movie_id} not found." });
                }

                // Check if this favorite already exists
                var existingFavorite = await _context.Favorites
                    .FirstOrDefaultAsync(f => f.user_id == favoriteDto.user_id && f.movie_id == favoriteDto.movie_id);
                
                if (existingFavorite != null)
                {
                    return Ok(UserFavoriteDto.FromEntity(existingFavorite)); // Already exists
                }
                
                var favorite = new UserFavorite
                {
                    user_id = favoriteDto.user_id,
                    movie_id = favoriteDto.movie_id
                };
                
                _context.Favorites.Add(favorite);
                await _context.SaveChangesAsync();
                
                return CreatedAtAction(nameof(GetUserFavorites), new { userId = favoriteDto.user_id }, UserFavoriteDto.FromEntity(favorite));
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in AddFavorite.");
                 return Unauthorized(new { message = ex.Message });
            }
             catch (Exception ex)
            {
                 _logger.LogError(ex, "Error adding favorite for user {UserId}, movie {MovieId}", favoriteDto?.user_id, favoriteDto?.movie_id);
                 return StatusCode(500, "An error occurred while adding the favorite.");
            }
        }
        
        [HttpDelete("favorites/{userId}/{movieId}")]
        public async Task<IActionResult> RemoveFavorite(int userId, string movieId)
        {
            // Secure: Check if the user ID in the path matches the authenticated user
             try
            {
                int currentUserId = GetCurrentUserId();
                 // REMOVED Admin check
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to remove favorite for user {TargetUserId}, movie {MovieId}.", currentUserId, userId, movieId);
                    return Forbid(); 
                }
                var favorite = await _context.Favorites
                    .FirstOrDefaultAsync(f => f.user_id == userId && f.movie_id == movieId);
                    
                if (favorite == null)
                {
                    return NotFound(); // Or Ok() if idempotency is desired
                }
                
                _context.Favorites.Remove(favorite);
                await _context.SaveChangesAsync();
                
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in RemoveFavorite.");
                 return Unauthorized(new { message = ex.Message });
            }
             catch (Exception ex)
            {
                 _logger.LogError(ex, "Error removing favorite for user {UserId}, movie {MovieId}", userId, movieId);
                 return StatusCode(500, "An error occurred while removing the favorite.");
            }
        }
        
        // Watchlist endpoints
        [HttpGet("watchlist/user/{userId}")]
        public async Task<ActionResult<List<UserWatchlistDto>>> GetUserWatchlist(int userId)
        {
            // Secure: Check if the requesting user is the target user
            try
            {
                int currentUserId = GetCurrentUserId();
                // REMOVED Admin check
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to access watchlist for user {TargetUserId}.", currentUserId, userId);
                    return Forbid(); 
                }
                 var watchlistItems = await _context.Watchlist
                    .Where(w => w.user_id == userId)
                    .Select(w => UserWatchlistDto.FromEntity(w))
                    .ToListAsync();
                return Ok(watchlistItems);
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in GetUserWatchlist.");
                 return Unauthorized(new { message = ex.Message });
            }
        }
        
        [HttpPost("watchlist")]
        public async Task<ActionResult<UserWatchlistDto>> AddToWatchlist([FromBody] UserWatchlistDto watchlistDto)
        {
            // Secure: Check if the DTO's user ID matches the authenticated user
            try
            {
                int currentUserId = GetCurrentUserId();
                // REMOVED Admin check
                if (watchlistDto.user_id != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to add watchlist item for user {TargetUserId}.", currentUserId, watchlistDto.user_id);
                    return Forbid(); 
                }

                // Check if movie exists (optional but good practice)
                var movieExists = await _context.Movies.AnyAsync(m => m.show_id == watchlistDto.movie_id);
                if (!movieExists)
                {
                    return BadRequest(new { message = $"Movie with ID {watchlistDto.movie_id} not found." });
                }

                var existingItem = await _context.Watchlist
                    .FirstOrDefaultAsync(w => w.user_id == watchlistDto.user_id && w.movie_id == watchlistDto.movie_id);
                
                if (existingItem != null)
                {
                    return Ok(UserWatchlistDto.FromEntity(existingItem)); // Already exists
                }
                
                var watchlistItem = new UserWatchlist
                {
                    user_id = watchlistDto.user_id,
                    movie_id = watchlistDto.movie_id
                };
                
                _context.Watchlist.Add(watchlistItem);
                await _context.SaveChangesAsync();
                
                return CreatedAtAction(nameof(GetUserWatchlist), new { userId = watchlistDto.user_id }, UserWatchlistDto.FromEntity(watchlistItem));
            }
             catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in AddToWatchlist.");
                 return Unauthorized(new { message = ex.Message });
            }
             catch (Exception ex)
            {
                 _logger.LogError(ex, "Error adding watchlist item for user {UserId}, movie {MovieId}", watchlistDto?.user_id, watchlistDto?.movie_id);
                 return StatusCode(500, "An error occurred while adding the watchlist item.");
            }
        }
        
        [HttpDelete("watchlist/{userId}/{movieId}")]
        public async Task<IActionResult> RemoveFromWatchlist(int userId, string movieId)
        {
            // Secure: Check if the user ID in the path matches the authenticated user
            try
            {
                int currentUserId = GetCurrentUserId();
                // REMOVED Admin check
                if (userId != currentUserId)
                {
                    _logger.LogWarning("User {CurrentUserId} attempted to remove watchlist item for user {TargetUserId}, movie {MovieId}.", currentUserId, userId, movieId);
                    return Forbid(); 
                }

                var watchlistItem = await _context.Watchlist
                    .FirstOrDefaultAsync(w => w.user_id == userId && w.movie_id == movieId);
                    
                if (watchlistItem == null)
                {
                    return NotFound(); // Or Ok()
                }
                
                _context.Watchlist.Remove(watchlistItem);
                await _context.SaveChangesAsync();
                
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                 _logger.LogWarning(ex, "Unauthorized access attempt in RemoveFromWatchlist.");
                 return Unauthorized(new { message = ex.Message });
            }
             catch (Exception ex)
            {
                 _logger.LogError(ex, "Error removing watchlist item for user {UserId}, movie {MovieId}", userId, movieId);
                 return StatusCode(500, "An error occurred while removing the watchlist item.");
            }
        }

        // --- Admin Only Movie Management Endpoints --- 

        [HttpPost] // POST /api/movies
        [Authorize(Roles = "Admin")] // Only Admins can add movies
        public async Task<ActionResult<MovieTitleDto>> AddMovie([FromBody] MovieDto movieDto)
        {
            // Use the custom validator
            var validationResults = MovieDtoValidator.Validate(movieDto);
            if (validationResults.Any())
            {
                foreach (var result in validationResults)
                {
                    foreach (var memberName in result.MemberNames)
                    {
                        ModelState.AddModelError(memberName, result.ErrorMessage);
                    }
                }
                return BadRequest(ModelState);
            }

            // Check for duplicate titles (optional, remove if not desired)
            if (!string.IsNullOrWhiteSpace(movieDto.title))
            {
                var duplicateTitleCheck = await _context.Movies
                    .Where(m => m.title != null && m.title.ToLower() == movieDto.title.ToLower())
                    .FirstOrDefaultAsync();
                    
                if (duplicateTitleCheck != null)
                {
                    return Conflict(new { 
                        message = $"A movie with title '{movieDto.title}' already exists (ID: {duplicateTitleCheck.show_id}).",
                        existing_id = duplicateTitleCheck.show_id
                    });
                }
            }

            // Validate year if provided
            if (movieDto.release_year.HasValue)
            {
                int currentYear = DateTime.Now.Year;
                if (movieDto.release_year < 1888 || movieDto.release_year > currentYear + 5) // Allow some future releases
                {
                    ModelState.AddModelError("release_year", $"Release year must be between 1888 and {currentYear + 5}");
                    return BadRequest(ModelState);
                }
            }

            // Basic mapping from DTO to MovieTitle entity
            var newMovie = new MovieTitle
            {
                // Generate a new show_id using GUID
                show_id = Guid.NewGuid().ToString(),
                type = movieDto.type,
                title = movieDto.title,
                director = movieDto.director,
                cast = movieDto.cast,
                country = movieDto.country,
                release_year = movieDto.release_year,
                rating = movieDto.rating,
                duration = movieDto.duration,
                description = movieDto.description
                // Genre flags are set separately below
            };

            // Handle genre flags if provided
            if (movieDto.genres != null && movieDto.genres.Any())
            {
                SetGenresOnMovie(newMovie, movieDto.genres);
            }

            try
            {
                _context.Movies.Add(newMovie);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Admin user created new movie with ID: {MovieId}, Title: {Title}", newMovie.show_id, newMovie.title);
                
                // Return the newly created movie details using the MovieTitleDto
                return CreatedAtAction(nameof(GetMovieTitle), new { id = newMovie.show_id }, MovieTitleDto.FromEntity(newMovie));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error saving new movie to database.");
                return StatusCode(500, "An error occurred while saving the movie.");
            }
        }

        [HttpPut("{id}")] // PUT /api/movies/{id}
        [Authorize(Roles = "Admin")] // Only Admins can update movies
        public async Task<IActionResult> UpdateMovie(string id, [FromBody] MovieDto movieDto)
        {
            // Use the custom validator
            var validationResults = MovieDtoValidator.Validate(movieDto);
            if (validationResults.Any())
            {
                foreach (var result in validationResults)
                {
                    foreach (var memberName in result.MemberNames)
                    {
                        ModelState.AddModelError(memberName, result.ErrorMessage);
                    }
                }
                return BadRequest(ModelState);
            }

            var existingMovie = await _context.Movies.FindAsync(id);
            if (existingMovie == null)
            {
                return NotFound(new { message = $"Movie with ID {id} not found." });
            }

            // Update properties from DTO
            existingMovie.type = movieDto.type;
            existingMovie.title = movieDto.title;
            existingMovie.director = movieDto.director;
            existingMovie.cast = movieDto.cast;
            existingMovie.country = movieDto.country;
            existingMovie.release_year = movieDto.release_year;
            existingMovie.rating = movieDto.rating;
            existingMovie.duration = movieDto.duration;
            existingMovie.description = movieDto.description;
            
            // Reset all genre flags
            ResetGenreFlags(existingMovie);
            
            // Handle genre flags if provided
            if (movieDto.genres != null && movieDto.genres.Any())
            {
                SetGenresOnMovie(existingMovie, movieDto.genres);
            }

            try
            {
                 _context.Entry(existingMovie).State = EntityState.Modified;
                 await _context.SaveChangesAsync();
                 
                 _logger.LogInformation("Admin user updated movie with ID: {MovieId}, Title: {Title}", id, existingMovie.title);
                 return NoContent(); // Standard success response for PUT update
            }
            catch (DbUpdateConcurrencyException ex) 
            { 
                 _logger.LogWarning(ex, "Concurrency error updating movie {MovieId}.", id);
                 return Conflict("The movie was modified by another user. Please refresh and try again.");
            }
            catch (DbUpdateException ex)
            {
                 _logger.LogError(ex, "Error updating movie {MovieId} in database.", id);
                 return StatusCode(500, "An error occurred while updating the movie.");
            }
        }

        [HttpDelete("{id}")] // DELETE /api/movies/{id}
        [Authorize(Roles = "Admin")] // Only Admins can delete movies
        public async Task<IActionResult> DeleteMovie(string id)
        {
            var movieToDelete = await _context.Movies.FindAsync(id);
            if (movieToDelete == null)
            {
                 return NotFound(new { message = $"Movie with ID {id} not found." });
            }

            try
            {
                // Handle related data before deletion
                await RemoveRelatedData(id);

                _context.Movies.Remove(movieToDelete);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Admin user deleted movie {MovieId}", id);
                return NoContent(); // Standard success response for DELETE
            }
             catch (DbUpdateException ex)
            {
                 // This might happen due to Foreign Key constraints if related data wasn't deleted
                 _logger.LogError(ex, "Error deleting movie {MovieId} from database, possibly due to related data.", id);
                 return StatusCode(500, "An error occurred while deleting the movie. Check for related ratings, favorites, or watchlist items.");
            }
        }
        
        // Dedicated endpoint for updating movie genres (Option C)
        [HttpPut("{id}/genres")]
        [Authorize(Roles = "Admin")] // Only Admins can update movie genres
        public async Task<IActionResult> UpdateMovieGenres(string id, [FromBody] List<string> genres)
        {
            var existingMovie = await _context.Movies.FindAsync(id);
            if (existingMovie == null)
            {
                return NotFound(new { message = $"Movie with ID {id} not found." });
            }

            try
            {
                // Reset all genre flags first
                ResetGenreFlags(existingMovie);
                
                // Set new genres
                if (genres != null && genres.Any())
                {
                    SetGenresOnMovie(existingMovie, genres);
                }

                _context.Entry(existingMovie).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Admin user updated genres for movie {MovieId}, Title: {Title}", id, existingMovie.title);
                return Ok(existingMovie.ActiveCategories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating genres for movie {MovieId}", id);
                return StatusCode(500, "An error occurred while updating the movie genres.");
            }
        }
        
        // Add GET endpoint to retrieve available genres for admin UI
        [HttpGet("genres")]
        [AllowAnonymous] // Allow anyone to get the list of available genres
        public ActionResult<List<string>> GetAvailableGenres()
        {
            var availableGenres = new List<string>
            {
                "Action", "Adventure", "Anime", "British TV", "Children", 
                "Comedy", "Crime", "Documentary", "Docuseries", "Drama", 
                "Family", "Fantasy", "Horror", "International", "Musical",
                "Nature", "Reality TV", "Romance", "Spirituality", 
                "Talk Show", "Thriller"
            };
            
            return Ok(availableGenres);
        }

        // Helper method to remove related data before deleting a movie
        private async Task RemoveRelatedData(string movieId)
        {
            // Remove ratings
            var ratings = await _context.Ratings.Where(r => r.show_id == movieId).ToListAsync();
            if (ratings.Any())
            {
                _context.Ratings.RemoveRange(ratings);
                _logger.LogInformation("Removed {Count} ratings for movie {MovieId}", ratings.Count, movieId);
            }
            
            // Remove favorites
            var favorites = await _context.Favorites.Where(f => f.movie_id == movieId).ToListAsync();
            if (favorites.Any())
            {
                _context.Favorites.RemoveRange(favorites);
                _logger.LogInformation("Removed {Count} favorite entries for movie {MovieId}", favorites.Count, movieId);
            }
            
            // Remove watchlist items
            var watchlistItems = await _context.Watchlist.Where(w => w.movie_id == movieId).ToListAsync();
            if (watchlistItems.Any())
            {
                _context.Watchlist.RemoveRange(watchlistItems);
                _logger.LogInformation("Removed {Count} watchlist entries for movie {MovieId}", watchlistItems.Count, movieId);
            }
        }
        
        // Helper method to set genre flags based on string list
        private void SetGenresOnMovie(MovieTitle movie, List<string> genres)
        {
            foreach (var genre in genres)
            {
                switch (genre.Trim().ToLower())
                {
                    case "action":
                        movie.Action = true;
                        movie.TV_Action = true; // Set both for consistency
                        break;
                    case "adventure":
                        movie.Adventure = true;
                        break;
                    case "anime":
                    case "anime series":
                        movie.Anime_Series_International_TV_Shows = true;
                        break;
                    case "british":
                    case "british tv":
                        movie.British_TV_Shows_Docuseries_International_TV_Shows = true;
                        break;
                    case "children":
                    case "kids":
                        movie.Children = true;
                        movie.Kids_TV = true;
                        break;
                    case "comedy":
                    case "comedies":
                        movie.Comedies = true;
                        movie.TV_Comedies = true;
                        break;
                    case "crime":
                        movie.Crime_TV_Shows_Docuseries = true;
                        break;
                    case "documentary":
                    case "documentaries":
                        movie.Documentaries = true;
                        break;
                    case "docuseries":
                        movie.Docuseries = true;
                        break;
                    case "drama":
                    case "dramas":
                        movie.Dramas = true;
                        movie.TV_Dramas = true;
                        break;
                    case "family":
                        movie.Family_Movies = true;
                        break;
                    case "fantasy":
                        movie.Fantasy = true;
                        break;
                    case "horror":
                        movie.Horror_Movies = true;
                        break;
                    case "international":
                        // Set international where it's the only flag
                        // Other combinations are handled in specific cases
                        if (genres.Contains("comedy") || genres.Contains("comedies"))
                            movie.Comedies_International_Movies = true;
                        if (genres.Contains("drama") || genres.Contains("dramas"))
                            movie.Dramas_International_Movies = true;
                        if (genres.Contains("documentary") || genres.Contains("documentaries"))
                            movie.Documentaries_International_Movies = true;
                        if (genres.Contains("thriller") || genres.Contains("thrillers"))
                            movie.International_Movies_Thrillers = true;
                        break;
                    case "musical":
                    case "musicals":
                        movie.Musicals = true;
                        break;
                    case "nature":
                        movie.Nature_TV = true;
                        break;
                    case "reality":
                    case "reality tv":
                        movie.Reality_TV = true;
                        break;
                    case "romance":
                    case "romantic":
                        if (genres.Contains("comedy") || genres.Contains("comedies"))
                            movie.Comedies_Romantic_Movies = true;
                        if (genres.Contains("drama") || genres.Contains("dramas"))
                            movie.Dramas_Romantic_Movies = true;
                        break;
                    case "spiritual":
                    case "spirituality":
                        movie.Spirituality = true;
                        break;
                    case "talk show":
                    case "talk shows":
                        movie.Talk_Shows_TV_Comedies = true;
                        break;
                    case "thriller":
                    case "thrillers":
                        movie.Thrillers = true;
                        break;
                }
            }
            
            // Handle complex combinations
            if (genres.Contains("international") && genres.Contains("romance") && 
                (genres.Contains("drama") || genres.Contains("dramas")))
            {
                movie.International_TV_Shows_Romantic_TV_Shows_TV_Dramas = true;
            }
            
            if (genres.Contains("comedy") && genres.Contains("drama") && genres.Contains("international"))
            {
                movie.Comedies_Dramas_International_Movies = true;
            }
        }
        
        // Helper method to reset all genre flags
        private void ResetGenreFlags(MovieTitle movie)
        {
            movie.Action = false;
            movie.Adventure = false;
            movie.Anime_Series_International_TV_Shows = false;
            movie.British_TV_Shows_Docuseries_International_TV_Shows = false;
            movie.Children = false;
            movie.Comedies = false;
            movie.Comedies_Dramas_International_Movies = false;
            movie.Comedies_International_Movies = false;
            movie.Comedies_Romantic_Movies = false;
            movie.Crime_TV_Shows_Docuseries = false;
            movie.Documentaries = false;
            movie.Documentaries_International_Movies = false;
            movie.Docuseries = false;
            movie.Dramas = false;
            movie.Dramas_International_Movies = false;
            movie.Dramas_Romantic_Movies = false;
            movie.Family_Movies = false;
            movie.Fantasy = false;
            movie.Horror_Movies = false;
            movie.International_Movies_Thrillers = false;
            movie.International_TV_Shows_Romantic_TV_Shows_TV_Dramas = false;
            movie.Kids_TV = false;
            movie.Language_TV_Shows = false;
            movie.Musicals = false;
            movie.Nature_TV = false;
            movie.Reality_TV = false;
            movie.Spirituality = false;
            movie.TV_Action = false;
            movie.TV_Comedies = false;
            movie.TV_Dramas = false;
            movie.Talk_Shows_TV_Comedies = false;
            movie.Thrillers = false;
        }

        [HttpGet("search")]
        [AllowAnonymous] // Allow anyone to search movies
        public async Task<ActionResult<object>> SearchMovies([FromQuery] string query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                // If no search query is provided, return regular paged results
                return await GetMovieTitlesPaged(page, pageSize);
            }

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;
            
            try
            {
                // Normalize the search query and add wildcard characters for SQL LIKE
                var sqlWildcardQuery = "%" + query.Trim() + "%";
                
                // Find movies matching the search query in multiple fields using SQL-compatible EF.Functions.Like
                var moviesQuery = _context.Movies
                    .Where(m => 
                        (m.title != null && EF.Functions.Like(m.title, sqlWildcardQuery)) ||
                        (m.director != null && EF.Functions.Like(m.director, sqlWildcardQuery)) ||
                        (m.cast != null && EF.Functions.Like(m.cast, sqlWildcardQuery)) ||
                        (m.description != null && EF.Functions.Like(m.description, sqlWildcardQuery))
                    )
                    .OrderBy(m => m.title);
                
                _logger.LogInformation("Executing search query: '{Query}'", sqlWildcardQuery);
                
                // Get total count for pagination
                var totalCount = await moviesQuery.CountAsync();
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
                
                _logger.LogInformation("Search count before pagination: {Count}", totalCount);
                
                // Get the specified page
                var movies = await moviesQuery
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();
                
                var movieDtos = movies.Select(m => MovieTitleDto.FromEntity(m)).ToList();
                
                _logger.LogInformation("Search for '{Query}' returned {Count} results (page {Page})", query, totalCount, page);
                
                return Ok(new {
                    movies = movieDtos,
                    pagination = new {
                        currentPage = page,
                        pageSize = pageSize,
                        totalPages = totalPages,
                        totalCount = totalCount,
                        hasNext = page < totalPages,
                        hasPrevious = page > 1
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching movies with query '{Query}'", query);
                return StatusCode(500, new { message = "An error occurred while searching movies." });
            }
        }

        // Improved diagnostics endpoint for troubleshooting database connection issues
        [HttpGet("diagnostics")]
        [AllowAnonymous] // Allow anyone to get diagnostics in this testing phase
        public ActionResult<object> GetDiagnostics()
        {
            Dictionary<string, object> diagnosticInfo = new Dictionary<string, object>();
            
            try
            {
                // Basic environment info
                diagnosticInfo["Environment"] = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown";
                diagnosticInfo["ContentRootPath"] = AppDomain.CurrentDomain.BaseDirectory;
                diagnosticInfo["CurrentDirectory"] = Directory.GetCurrentDirectory();
                diagnosticInfo["MachineName"] = Environment.MachineName;
                diagnosticInfo["OSVersion"] = Environment.OSVersion.ToString();
                
                // Configuration info
                diagnosticInfo["ConnectionString"] = _context.Database.GetConnectionString() ?? "No connection string found";
                
                // Database file checks
                try
                {
                    string connectionString = _context.Database.GetConnectionString() ?? "";
                    string dbFilePath = connectionString.Replace("Data Source=", "");
                    
                    diagnosticInfo["DatabaseFilePath"] = dbFilePath;
                    diagnosticInfo["DatabaseFileExists"] = IOFile.Exists(dbFilePath);
                    
                    if (IOFile.Exists(dbFilePath))
                    {
                        FileInfo fileInfo = new FileInfo(dbFilePath);
                        diagnosticInfo["DatabaseFileSize"] = fileInfo.Length;
                        diagnosticInfo["DatabaseFileLastModified"] = fileInfo.LastWriteTime;
                        diagnosticInfo["DatabaseFileAttributes"] = fileInfo.Attributes.ToString();
                    }
                    
                    // Check parent directory
                    string dbDir = Path.GetDirectoryName(dbFilePath) ?? "";
                    diagnosticInfo["DatabaseDirectoryExists"] = Directory.Exists(dbDir);
                    
                    if (Directory.Exists(dbDir))
                    {
                        diagnosticInfo["DirectoryContents"] = Directory.GetFiles(dbDir).ToList();
                    }
                }
                catch (Exception fileEx)
                {
                    diagnosticInfo["FileCheckError"] = fileEx.Message;
                }
                
                // Database connection check
                try
                {
                    diagnosticInfo["CanConnect"] = _context.Database.CanConnect();
                }
                catch (Exception connEx)
                {
                    diagnosticInfo["ConnectionError"] = connEx.Message;
                    diagnosticInfo["ConnectionStackTrace"] = connEx.StackTrace;
                }
                
                // Try to count movies
                try
                {
                    int movieCount = _context.Movies.Count();
                    diagnosticInfo["MovieCount"] = movieCount;
                }
                catch (Exception countEx)
                {
                    diagnosticInfo["MovieCountError"] = countEx.Message;
                    diagnosticInfo["MovieCountStackTrace"] = countEx.StackTrace;
                }
                
                return Ok(new
                {
                    Status = "Success",
                    Message = "Diagnostic information retrieved successfully",
                    DiagnosticInfo = diagnosticInfo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting diagnostic information");
                diagnosticInfo["Error"] = ex.Message;
                diagnosticInfo["StackTrace"] = ex.StackTrace;
                diagnosticInfo["InnerException"] = ex.InnerException?.Message;
                
                return StatusCode(500, new
                {
                    Status = "Error",
                    Message = "Error getting diagnostic information",
                    DiagnosticInfo = diagnosticInfo
                });
            }
        }

        // Database structure check endpoint
        [HttpGet("dbcheck")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> CheckDatabaseStructure()
        {
            var result = new Dictionary<string, object>();
            
            try
            {
                result["DatabaseConnection"] = _context.Database.GetConnectionString();
                
                // Check database file exists
                try
                {
                    string connectionString = _context.Database.GetConnectionString() ?? "";
                    string dbFilePath = connectionString.Replace("Data Source=", "");
                    result["DatabaseFilePath"] = dbFilePath;
                    result["DatabaseFileExists"] = IOFile.Exists(dbFilePath);
                    
                    if (IOFile.Exists(dbFilePath))
                    {
                        FileInfo fi = new FileInfo(dbFilePath);
                        result["DatabaseFileSize"] = fi.Length;
                    }
                }
                catch (Exception pathEx)
                {
                    result["PathCheckError"] = pathEx.Message;
                }
                
                // Check if database can connect
                try
                {
                    result["CanConnect"] = _context.Database.CanConnect();
                }
                catch (Exception connEx)
                {
                    result["ConnectionError"] = connEx.Message;
                }
                
                // Try to get the first 5 records using EF Core
                try
                {
                    var firstFew = await _context.Movies
                        .Take(5)
                        .Select(m => new 
                        {
                            m.show_id,
                            m.title,
                            m.type,
                            m.director,
                            m.cast
                        })
                        .ToListAsync();
                        
                    result["FirstFewRecords"] = firstFew;
                }
                catch (Exception queryEx)
                {
                    result["QueryError"] = queryEx.Message;
                    
                    // If EF Core fails, try a basic ADO.NET approach
                    try
                    {
                        var conn = _context.Database.GetDbConnection();
                        if (conn.State != System.Data.ConnectionState.Open)
                        {
                            await conn.OpenAsync();
                        }
                        
                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = "SELECT show_id, title, type FROM movies_titles LIMIT 3";
                        
                        using var reader = await cmd.ExecuteReaderAsync();
                        var rawResults = new List<Dictionary<string, object>>();
                        
                        while (await reader.ReadAsync())
                        {
                            var row = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                var name = reader.GetName(i);
                                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                row[name] = value;
                            }
                            rawResults.Add(row);
                        }
                        
                        result["RawSqlResults"] = rawResults;
                    }
                    catch (Exception adoEx)
                    {
                        result["AdoNetError"] = adoEx.Message;
                    }
                }
                
                // Try to count records
                try
                {
                    result["RecordCount"] = await _context.Movies.CountAsync();
                }
                catch (Exception countEx)
                {
                    result["CountError"] = countEx.Message;
                }
                
                // Get table info using reflection
                try
                {
                    var properties = typeof(MovieTitle).GetProperties()
                        .Select(p => new { 
                            Name = p.Name, 
                            Type = p.PropertyType.Name,
                            IsNullable = Nullable.GetUnderlyingType(p.PropertyType) != null
                        })
                        .ToList();
                        
                    result["ModelProperties"] = properties;
                }
                catch (Exception reflectionEx)
                {
                    result["ReflectionError"] = reflectionEx.Message;
                }
                
                return Ok(new
                {
                    Status = "Success",
                    Timestamp = DateTime.UtcNow,
                    DiagnosticInfo = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking database structure");
                result["FatalError"] = ex.Message;
                result["FatalErrorStack"] = ex.StackTrace;
                
                return StatusCode(500, new
                {
                    Status = "Error",
                    Timestamp = DateTime.UtcNow,
                    DiagnosticInfo = result
                });
            }
        }
    }
}