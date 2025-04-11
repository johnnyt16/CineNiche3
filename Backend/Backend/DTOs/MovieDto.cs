using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs
{
    /// <summary>
    /// Data Transfer Object for creating or updating a movie.
    /// </summary>
    public class MovieDto
    {
        // show_id is typically generated or handled separately, not part of input DTO
        
        [Required]
        public string? type { get; set; }
        
        [Required]
        [StringLength(200, MinimumLength = 1)]
        public string? title { get; set; }
        
        public string? director { get; set; }
        
        public string? cast { get; set; }
        
        public string? country { get; set; }
        
        public int? release_year { get; set; }
        
        public string? rating { get; set; }
        
        public string? duration { get; set; }
        
        public string? description { get; set; }
        
        // Add a list of genres/categories to support Option B
        public List<string>? genres { get; set; }
    }
} 