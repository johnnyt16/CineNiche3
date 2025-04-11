using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.DTOs // Or Backend.DTOs if that's preferred
{
    // DTO for the /verify endpoint request body
    public class VerifyTokenRequest
    {
        public string Token { get; set; }
    }

    // DTOs for deserializing the Stytch API /authenticate response

    public class StytchAuthResponse
    {
        // Consider adding other potential fields like session_jwt, request_id, etc. if needed
        public StytchUser User { get; set; }
        public string SessionToken { get; set; }
        public int StatusCode { get; set; } // Stytch API often returns status_code in body
    }

    // Response for user registration/creation
    public class StytchUserResponse
    {
        public string UserId { get; set; }
        public string Email { get; set; }
        public int StatusCode { get; set; }
    }

    public class StytchUser
    {
        public string UserId { get; set; }
        public string Email { get; set; } // Sometimes present directly
        public List<StytchEmail> Emails { get; set; } = new List<StytchEmail>();
        // Add other fields if needed (e.g., Name, PhoneNumbers)
        // public StytchName Name { get; set; }
    }

    public class StytchEmail
    {
        public string Email { get; set; }
        public bool Verified { get; set; }
        public string EmailId { get; set; } // Stytch often includes an email_id
    }

    /* Example structure if Name is needed
    public class StytchName
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string MiddleName { get; set; }
    }
    */

    // Add these DTOs for 2FA

    public class Enable2FARequest
    {
        [Required]
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public class Verify2FARequest
    {
        [Required]
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;
    }

    public class StytchSmsResponse
    {
        public string? MethodId { get; set; }
        public string? RequestId { get; set; }
        public int? StatusCode { get; set; }
    }

    public class StytchAuthenticateResponse
    {
        public bool AuthenticateSuccess { get; set; }
        public string? RequestId { get; set; }
        public int? StatusCode { get; set; }
        public string? UserId { get; set; }
    }
} 