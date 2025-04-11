using CineNiche.API.Data;
using System.Text.Json.Serialization;

namespace CineNiche.API.DTOs
{
    public class MovieUserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        
        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; }
        public string StytchUserId { get; set; } // Changed from stytch_user_id

        // Assuming CineNiche.API.Data.MovieUser needs creating or mapping logic adjusted
        // Or assuming Backend.Models.User is the primary entity
        // This mapping needs to align with the actual entity used (Backend.Models.User)
        public static MovieUserDto FromEntity(Backend.Models.User entity) // Changed parameter type
        {
            return new MovieUserDto
            {
                Id = entity.Id, // Map from Id
                Name = entity.Username, // Map from Username
                Email = entity.Email,
                // Map other properties if they exist on Backend.Models.User
                // Phone = entity.Phone, // Example
                // Age = entity.Age, // Example
                // Gender = entity.Gender, // Example
                // City = entity.City, // Example
                // State = entity.State, // Example
                IsAdmin = false, // Defaulting to false - needs logic if User has IsAdmin
                StytchUserId = entity.StytchUserId
            };
        }
    }
}