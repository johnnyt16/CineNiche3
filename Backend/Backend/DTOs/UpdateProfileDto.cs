using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs // Or Backend.DTOs
{
    public class UpdateProfileDto
    {
        // Optional: Include Name/Username if you want to allow changing it here
        // public string Username { get; set; }

        // Making these nullable as user might not provide all at once
        [Phone]
        public string Phone { get; set; }

        [Range(13, 120)] // Example validation: Age must be between 13 and 120
        public int? Age { get; set; }

        public string Gender { get; set; }

        public string City { get; set; }

        public string State { get; set; }

        // You could add other fields here like birthday, etc.
    }
} 