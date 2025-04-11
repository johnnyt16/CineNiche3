using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs
{
    public class LoginPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
} 