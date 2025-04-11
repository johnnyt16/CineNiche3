using System;
using System.Text.Json.Serialization;

namespace CineNiche.API.DTOs
{
    /// <summary>
    /// Response returned after successful login/authentication
    /// </summary>
    public class LoginResponseDto
    {
        /// <summary>
        /// JWT token for subsequent authenticated requests
        /// </summary>
        public string Token { get; set; }
        
        /// <summary>
        /// Basic user information
        /// </summary>
        public UserInfoDto User { get; set; }
    }

    /// <summary>
    /// User information returned after login
    /// </summary>
    public class UserDto
    {
        /// <summary>
        /// User's ID in the database
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// User's name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// User's email address
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// Whether the user has admin privileges
        /// </summary>
        public bool IsAdmin { get; set; }
    }
}