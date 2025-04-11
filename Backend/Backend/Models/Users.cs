using System;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        
        public string Username { get; set; }
        
        // Stytch unique identifier
        [Required]
        public string StytchUserId { get; set; }
        
        // For traditional password authentication
        public string PasswordHash { get; set; } // Store hashed password
        public string PasswordSalt { get; set; } // Store salt used for hashing
        
        // Additional profile information (nullable)
        public string Phone { get; set; }
        public int? Age { get; set; } // Nullable int
        public string Gender { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? LastLoginAt { get; set; }
    }
}