using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs
{
    /// <summary>
    /// DTO for Stytch authentication login requests
    /// </summary>
    public class LoginDto
    {
        /// <summary>
        /// The authentication token provided by Stytch (required)
        /// </summary>
        [Required]
        public string Token { get; set; }
        
        /// <summary>
        /// The type of token being provided (oauth, session, passwords)
        /// </summary>
        [Required]
        public string TokenType { get; set; }
        
        /// <summary>
        /// Email address (only required for password authentication)
        /// </summary>
        public string Email { get; set; }
        
        /// <summary>
        /// Password (only required for password authentication)
        /// </summary>
        public string Password { get; set; }
    }
}