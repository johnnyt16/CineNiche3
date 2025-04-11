using System.ComponentModel.DataAnnotations;

namespace CineNiche.API.Data;


// Models/MovieUser.cs
public class MovieUser
{
    [Key]
    public int user_id { get; set; } // Primary key - required
    public string name { get; set; }
    public string phone { get; set; }
    public string email { get; set; }
    public int age { get; set; }
    public string gender { get; set; }
    public string city { get; set; }
    public string state { get; set; }
    public string password { get; set; } // Original password field
    public string? StytchUserId { get; set; } // Match database column name - Nullable
    public string? PasswordHash { get; set; } // Match database column name - Nullable
    public string? PasswordSalt { get; set; } // Match database column name - Nullable
    public int isAdmin { get; set; } // 0 for regular users, 1 for admins
    public bool? HasMfaEnabled { get; set; }
    public string? MfaPhoneNumber { get; set; }
}

