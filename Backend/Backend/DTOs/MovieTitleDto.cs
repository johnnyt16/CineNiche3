using System.Diagnostics;
using System.Text.Json.Serialization;

namespace CineNiche.API.DTOs
{
    public class MovieTitleDto
    {
        public string show_id { get; set; } = null!;
        public string? type { get; set; }
        public string? title { get; set; }
        public string? director { get; set; }
        public string? cast { get; set; }
        public string? country { get; set; }
        public int? release_year { get; set; }
        public string? rating { get; set; }
        public string? duration { get; set; }
        public string? description { get; set; }
        public List<string> Categories { get; set; } = new();
        
        // Changed to standard property to ensure it's serialized
        public int? RuntimeMinutes { get; set; }
        
        // Add this to make it easier for frontend to access category information
        public bool HasGenre(string genre)
        {
            if (Categories == null || !Categories.Any())
                return false;
                
            return Categories.Any(c => c.Equals(genre, StringComparison.OrdinalIgnoreCase));
        }
        
        // Add this to provide more flexibility for frontend filters
        [JsonIgnore] // Don't serialize these properties to avoid duplication
        public bool IsAction => HasGenre("Action");
        
        [JsonIgnore]
        public bool IsComedy => HasGenre("Comedies") || HasGenre("Comedy");
        
        [JsonIgnore]
        public bool IsDrama => HasGenre("Dramas") || HasGenre("Drama");
        
        [JsonIgnore]
        public bool IsDocumentary => HasGenre("Documentaries") || HasGenre("Documentary");
        
        [JsonIgnore]
        public bool IsInternational => Categories?.Any(c => c.Equals("International", StringComparison.OrdinalIgnoreCase)) == true;
        
        [JsonIgnore]
        public bool IsRomance => Categories?.Any(c => c.Contains("Romance", StringComparison.OrdinalIgnoreCase)) == true;
        
        [JsonIgnore]
        public bool IsThriller => HasGenre("Thrillers") || HasGenre("Thriller");
        
        public static MovieTitleDto FromEntity(MovieTitle entity)
        {
            if (entity == null) 
            {
                throw new ArgumentNullException(nameof(entity), "Cannot create DTO from null entity");
            }

            var dto = new MovieTitleDto
            {
                show_id = entity.show_id,
                type = entity.type,
                title = entity.title,
                director = entity.director,
                cast = entity.cast,
                country = entity.country,
                release_year = entity.release_year,
                rating = entity.rating,
                duration = entity.duration,
                description = entity.description,
                Categories = entity.ActiveCategories ?? new List<string>()
            };
            
            // Explicitly set RuntimeMinutes
            dto.RuntimeMinutes = ParseRuntime(entity.duration);
            
            // Log the DTO for debugging (avoid null reference exception)
            Console.WriteLine($"Created DTO for movie: {dto.title ?? "(no title)"}, Fields: " +
                $"ID={dto.show_id}, " +
                $"Director={dto.director ?? "null"}, " +
                $"Cast={dto.cast ?? "null"}, " +
                $"Country={dto.country ?? "null"}, " +
                $"Categories={string.Join(",", dto.Categories)}, " +
                $"Runtime={dto.RuntimeMinutes}");
            
            // Log what we're returning to help diagnose frontend issues
            try
            {
                Console.WriteLine($"RETURNING DTO FOR {dto.title ?? "(no title)"}: {System.Text.Json.JsonSerializer.Serialize(dto)}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error serializing DTO for logging: {ex.Message}");
            }
            
            return dto;
        }
        
        // Helper method to parse duration string (e.g. "90 min") to minutes
        private static int? ParseRuntime(string? duration)
        {
            if (string.IsNullOrEmpty(duration))
                return null;
                
            try
            {
                // Simple case: "90 min"
                if (duration.Contains("min"))
                {
                    var minutes = duration.Split(' ')[0];
                    if (int.TryParse(minutes, out int result))
                        return result;
                }
                
                // More complex case: "1h 30min" or "1 hr 30 min"
                if (duration.Contains("h") || duration.Contains("hr"))
                {
                    int hours = 0;
                    int minutes = 0;
                    
                    var parts = duration.Split(' ');
                    for (int i = 0; i < parts.Length - 1; i++)
                    {
                        if (parts[i+1].StartsWith("h"))
                        {
                            if (int.TryParse(parts[i], out int h))
                                hours = h;
                        }
                        else if (parts[i+1].StartsWith("m"))
                        {
                            if (int.TryParse(parts[i], out int m))
                                minutes = m;
                        }
                    }
                    
                    return hours * 60 + minutes;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing duration '{duration}': {ex.Message}");
            }
            
            return null;
        }
    }
}