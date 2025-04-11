using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using CineNiche.API.DTOs;

namespace CineNiche.API.Validation
{
    public static class MovieDtoValidator
    {
        public static List<ValidationResult> Validate(MovieDto movieDto)
        {
            var results = new List<ValidationResult>();
            var context = new ValidationContext(movieDto);
            
            // Perform standard validation
            Validator.TryValidateObject(movieDto, context, results, true);
            
            // Additional validation rules
            if (movieDto.release_year.HasValue)
            {
                int currentYear = DateTime.Now.Year;
                if (movieDto.release_year < 1888 || movieDto.release_year > currentYear + 5)
                {
                    results.Add(new ValidationResult(
                        $"Release year must be between 1888 and {currentYear + 5}",
                        new[] { nameof(movieDto.release_year) }
                    ));
                }
            }
            
            // Validate duration format if provided
            if (!string.IsNullOrEmpty(movieDto.duration))
            {
                // Check common patterns like "90 min", "1h 30min", "1 hr 30 min"
                var isValidFormat = Regex.IsMatch(movieDto.duration, @"^\d+\s*min$") || // "90 min"
                                   Regex.IsMatch(movieDto.duration, @"^\d+\s*h(\s*\d+\s*min)?$") || // "1h" or "1h 30min"
                                   Regex.IsMatch(movieDto.duration, @"^\d+\s*hr(\s*\d+\s*min)?$"); // "1 hr" or "1 hr 30 min"
                
                if (!isValidFormat)
                {
                    results.Add(new ValidationResult(
                        "Duration should be in a format like '90 min', '1h 30min', or '1 hr 30 min'",
                        new[] { nameof(movieDto.duration) }
                    ));
                }
            }
            
            // Validate genre list if provided
            if (movieDto.genres != null && movieDto.genres.Any())
            {
                // List of valid genres (use the same list as in GetAvailableGenres)
                var validGenres = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "Action", "Adventure", "Anime", "British TV", "Children", 
                    "Comedy", "Comedies", "Crime", "Documentary", "Documentaries", 
                    "Docuseries", "Drama", "Dramas", "Family", "Fantasy", 
                    "Horror", "International", "Musical", "Musicals", "Nature", 
                    "Reality TV", "Reality", "Romance", "Romantic", "Spirituality", 
                    "Talk Show", "Talk Shows", "Thriller", "Thrillers", "Kids"
                };
                
                foreach (var genre in movieDto.genres)
                {
                    if (!string.IsNullOrEmpty(genre) && !validGenres.Contains(genre))
                    {
                        results.Add(new ValidationResult(
                            $"'{genre}' is not a recognized genre. Use the GET /api/movies/genres endpoint to see available options.",
                            new[] { nameof(movieDto.genres) }
                        ));
                    }
                }
            }
            
            return results;
        }
    }
} 