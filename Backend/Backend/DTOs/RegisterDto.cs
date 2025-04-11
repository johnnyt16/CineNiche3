using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs // Or Backend.DTOs if preferred
{
    public class RegisterDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)] // Example: enforce minimum password length
        public string Password { get; set; }

        // Optional: Include other fields like Username, Name, etc.
        public string Username { get; set; }
    }
} 