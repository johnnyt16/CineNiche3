using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;
using Backend.Models;
using CineNiche.API.Data;
using Microsoft.EntityFrameworkCore;
using CineNiche.API.DTOs;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly MoviesDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly string _stytchProjectId;
        private readonly string _stytchSecret;

        public AuthController(
            IConfiguration configuration,
            ILogger<AuthController> logger,
            MoviesDbContext context,
            IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _httpClient = httpClientFactory.CreateClient("StytchClient");
            
            // Read from configuration
            _stytchProjectId = configuration["Stytch:ProjectID"];
            _stytchSecret = configuration["Stytch:Secret"];
            
            // Configure HTTP client with basic auth using project ID and secret
            var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_stytchProjectId}:{_stytchSecret}"));
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            
            // Get base URL from config or use default
            var baseUrl = configuration["Stytch:BaseUrl"] ?? "https://test.stytch.com/v1/";
            _httpClient.BaseAddress = new Uri(baseUrl);
        }

        // This endpoint will handle authentication with a Stytch token (OAuth or password)
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            try
            {
                // Determine which Stytch endpoint to use based on token type
                string endpoint;
                StringContent payload;
                
                if (request.TokenType.Equals("oauth", StringComparison.OrdinalIgnoreCase))
                {
                    endpoint = "oauth/authenticate";
                    payload = new StringContent(
                        JsonSerializer.Serialize(new { token = request.Token }),
                        Encoding.UTF8,
                        "application/json");
                }
                else if (request.TokenType.Equals("session", StringComparison.OrdinalIgnoreCase))
                {
                    endpoint = "sessions/authenticate";
                    payload = new StringContent(
                        JsonSerializer.Serialize(new { session_token = request.Token }),
                        Encoding.UTF8,
                        "application/json");
                }
                else if (request.TokenType.Equals("passwords", StringComparison.OrdinalIgnoreCase))
                {
                    endpoint = "passwords/authenticate";
                    payload = new StringContent(
                        JsonSerializer.Serialize(new { 
                            password = request.Password,
                            email = request.Email
                        }),
                        Encoding.UTF8,
                        "application/json");
                }
                else
                {
                    return BadRequest(new { message = $"Unsupported token type: {request.TokenType}" });
                }
                
                // Call Stytch API
                var response = await _httpClient.PostAsync(endpoint, payload);
                var content = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Stytch authentication failed: {StatusCode} - {Content}", 
                        response.StatusCode, content);
                    return Unauthorized(new { message = "Authentication failed" });
                }
                
                // Deserialize Stytch response
                var stytchResponse = JsonSerializer.Deserialize<StytchAuthResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (stytchResponse?.User == null)
                {
                    _logger.LogWarning("Stytch response did not contain user information. Content: {Content}", content);
                    return Unauthorized(new { message = "Authentication failed - invalid Stytch response" });
                }
                
                // Get user info
                string userId = stytchResponse.User.UserId;
                string email = stytchResponse.User.Emails?.FirstOrDefault(e => e.Verified)?.Email
                               ?? stytchResponse.User.Emails?.FirstOrDefault()?.Email
                               ?? stytchResponse.User.Email
                               ?? "unknown@example.com";
                
                // Find or create user in our database
                var movieUser = await FindOrCreateUserFromStytchAsync(userId, email);
                
                // Generate a JWT token using MovieUser
                var token = GenerateJwtToken(movieUser); 
                
                // Convert MovieUser to UserInfoDto for response
                var userInfoDto = movieUser.ToUserInfoDto();

                return Ok(new LoginResponseDto
                {
                    Token = token,
                    User = userInfoDto
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Stytch login");
                return StatusCode(500, new { message = "An error occurred during login" });
            }
        }

        // Optional: Endpoint to verify an existing JWT token
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyToken([FromBody] VerifyTokenRequest request)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Secret"]);
                
                tokenHandler.ValidateToken(request.Token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["Jwt:Audience"],
                    ClockSkew = TimeSpan.Zero
                }, out var validatedToken);
                
                var jwtToken = (JwtSecurityToken)validatedToken;
                var userIdClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "id");

                if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
                {
                    _logger.LogWarning("JWT token verification failed: User ID claim ('id') missing or invalid.");
                    return Unauthorized(new { message = "Invalid token: User ID missing or invalid" });
                }
                
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("JWT token verification failed: User with ID {UserId} not found.", userId);
                    return Unauthorized(new { message = "Invalid token: User not found" });
                }
                
                return Ok(user.ToUserInfoDto());
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "JWT token validation failed.");
                return Unauthorized(new { message = "Invalid token" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token verification");
                return StatusCode(500, new { message = "An error occurred during token verification" });
            }
        }

        private string GenerateJwtToken(MovieUser movieUser)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Secret"]);
            
            var claims = new List<Claim>
            {
                // Use the standard ClaimTypes.NameIdentifier for the user ID to be more compliant
                new Claim(ClaimTypes.NameIdentifier, movieUser.user_id.ToString()),
                // Still keep the "id" claim for backward compatibility
                new Claim("id", movieUser.user_id.ToString()),
                new Claim(ClaimTypes.Email, movieUser.email),
                new Claim(ClaimTypes.Name, movieUser.name ?? movieUser.email),
                // Add Role claim based on isAdmin
                new Claim(ClaimTypes.Role, movieUser.isAdmin == 1 ? "Admin" : "User")
            };
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7), // Consider reducing expiry for production
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private async Task<MovieUser> FindOrCreateUserFromStytchAsync(string stytchUserId, string email)
        {
            // Try to find User by StytchUserId first
            var movieUser = await _context.Users
                .FirstOrDefaultAsync(u => u.name == stytchUserId);  // Use name field for stytchUserId

            if (movieUser != null)
            {
                // Convert to User model
                return movieUser;
            }

            // Then look for user by email
            movieUser = await _context.Users
                .FirstOrDefaultAsync(u => u.email == email);

            if (movieUser != null)
            {
                // Add or update stytchUserId (in name field)
                if (string.IsNullOrEmpty(movieUser.name))
                {
                    movieUser.name = stytchUserId;
                    await _context.SaveChangesAsync();
                }
                else if (movieUser.name != stytchUserId)
                {
                    _logger.LogWarning("Attempted to link Stytch ID {NewStytchUserId} to email {Email}, but it's already linked to Stytch ID {ExistingStytchUserId}.", 
                        stytchUserId, email, movieUser.name);
                    throw new InvalidOperationException($"User with email {email} is already linked to a different Stytch account.");
                }

                return movieUser; // Convert to User model
            }

            // Create a new user record
            var newMovieUser = new MovieUser
            {
                email = email,
                name = stytchUserId,  // Use name for StytchUserId
                phone = string.Empty,
                gender = string.Empty,
                city = string.Empty,
                state = string.Empty,
                age = 0,
                password = "stytch-auth", // Placeholder
                isAdmin = 0 // Regular user
            };

            await _context.Users.AddAsync(newMovieUser);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new user with ID {UserId} for Stytch ID {StytchUserId} and email {Email}.", 
                newMovieUser.user_id, stytchUserId, email);
                
            return newMovieUser; // Convert to User model
        }

        // New endpoint for user registration
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            try
            {
                // 1. Validate Input
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Registration failed for {Email}: Invalid model state.", request.Email);
                    return BadRequest(ModelState);
                }

                // *** Add Password Complexity Validation ***
                var passwordErrors = new List<string>();
                if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 10)
                {
                    passwordErrors.Add("Password must be at least 10 characters long.");
                }
                if (!request.Password.Any(char.IsLower))
                {
                    passwordErrors.Add("Password must contain at least one lowercase letter.");
                }
                if (!request.Password.Any(char.IsUpper))
                {
                    passwordErrors.Add("Password must contain at least one uppercase letter.");
                }
                if (!request.Password.Any(char.IsDigit))
                {
                    passwordErrors.Add("Password must contain at least one digit.");
                }
                // Optionally add symbol check: !request.Password.Any(ch => !char.IsLetterOrDigit(ch))

                if (passwordErrors.Any())
                {
                     _logger.LogWarning("Registration failed for {Email}: Password complexity requirements not met.", request.Email);
                     // Return a BadRequest with specific password errors
                     return BadRequest(new { message = "Password does not meet complexity requirements.", errors = passwordErrors });
                }
                // *** End Password Complexity Validation ***

                // 2. Check if user already exists
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.email == request.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Registration failed for {Email}: Email already exists.", request.Email);
                    return Conflict(new { message = "Email already exists" });
                }

                // 3. Try to register with Stytch first
                string stytchUserId = null;
                try
                {
                    // Try to register the user with Stytch
                    var stytchPayload = new StringContent(
                        JsonSerializer.Serialize(new
                        {
                            email = request.Email,
                            password = request.Password,
                            name = request.Username ?? request.Email.Split('@')[0]
                        }),
                        Encoding.UTF8,
                        "application/json");

                    var stytchResponse = await _httpClient.PostAsync("passwords", stytchPayload);
                    var stytchContent = await stytchResponse.Content.ReadAsStringAsync();

                    if (stytchResponse.IsSuccessStatusCode)
                    {
                        var stytchResult = JsonSerializer.Deserialize<StytchUserResponse>(stytchContent,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        
                        if (stytchResult?.UserId != null)
                        {
                            stytchUserId = stytchResult.UserId;
                            _logger.LogInformation("Successfully registered with Stytch: {StytchUserId}", stytchUserId);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Failed to register with Stytch: {StatusCode} - {Content}",
                            stytchResponse.StatusCode, stytchContent);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during Stytch registration for {Email}", request.Email);
                }

                // 4. Hash Password
                string salt = GenerateSalt();
                string passwordHash = HashPassword(request.Password, salt);
                _logger.LogInformation("Password hashed for user {Email}", request.Email);

                // 5. Create New User Entity - use MovieUser directly
                var newMovieUser = new MovieUser
                {
                    email = request.Email,
                    name = request.Username ?? request.Email.Split('@')[0],
                    password = passwordHash, // Store the hashed password for backward compatibility
                    PasswordHash = passwordHash, // Also store in new field
                    PasswordSalt = salt, // Store salt in new field
                    StytchUserId = stytchUserId, // Store Stytch user ID
                    phone = string.Empty,
                    gender = string.Empty,
                    city = string.Empty,
                    state = string.Empty,
                    age = 0,
                    isAdmin = 0 // Default to regular user
                };

                // 6. Save User to Database
                try
                {
                    await _context.Users.AddAsync(newMovieUser);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully registered new user with ID {UserId} and email {Email}", 
                        newMovieUser.user_id, newMovieUser.email);

                    // Generate JWT using the created MovieUser
                    var token = GenerateJwtToken(newMovieUser);
                    
                    // Convert MovieUser to UserInfoDto for response
                    var userInfoDto = newMovieUser.ToUserInfoDto();
                    
                    // Return 200 OK with LoginResponseDto
                    return Ok(new LoginResponseDto
                    {
                        User = userInfoDto,
                        Token = token
                    });
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Database error during registration for {Email}", request.Email);
                    return StatusCode(500, new { message = "An error occurred during registration (database)." });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error during registration for {Email}", request.Email);
                    return StatusCode(500, new { message = "An unexpected error occurred during registration." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during registration process for {Email}", request.Email);
                return StatusCode(500, new { message = "An unexpected error occurred during registration." });
            }
        }

        // Placeholder for GetUserById needed by CreatedAtAction
        // TODO: Implement this endpoint properly if needed, maybe in a separate UserController
        [HttpGet("{id}")]
        [ApiExplorerSettings(IgnoreApi = true)] // Hide from Swagger for now
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(user.ToUserInfoDto());
        }

        // --- Password Hashing Helpers ---

        private static string GenerateSalt(int size = 16) // 128 bit
        {
            var randomNumber = new byte[size];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
            }
            return Convert.ToBase64String(randomNumber);
        }

        private static string HashPassword(string password, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                return Convert.ToBase64String(rfc2898DeriveBytes.GetBytes(32)); // 256 bit hash
            }
        }

        // Method to verify password (needed for password login)
        private static bool VerifyPassword(string enteredPassword, string storedHash, string storedSalt)
        {
            var saltBytes = Convert.FromBase64String(storedSalt);
            using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(enteredPassword, saltBytes, 10000, HashAlgorithmName.SHA256))
            {
                var hashBytes = rfc2898DeriveBytes.GetBytes(32);
                var enteredHash = Convert.ToBase64String(hashBytes);
                return enteredHash == storedHash;
            }
        }
        
        // New endpoint for direct email/password login
        [HttpPost("login-with-password")]
        public async Task<IActionResult> LoginWithPassword([FromBody] LoginPasswordDto request)
        {
            string debugStep = "start";
            
            try
            {
                _logger.LogInformation("Attempting login for email: {Email}", request.Email);
                
                debugStep = "db-query";
                var movieUser = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.email == request.Email);
                
                debugStep = "user-check";
                if (movieUser == null)
                {
                    _logger.LogWarning("User not found: {Email}", request.Email);
                    return Unauthorized(new { message = "Invalid email or password" });
                }
                
                _logger.LogInformation("User found: ID={UserId}, Email={Email}", movieUser.user_id, movieUser.email);

                // Check if this is a hardcoded admin account without hash/salt
                if (movieUser.isAdmin == 1 && (string.IsNullOrEmpty(movieUser.PasswordHash) || string.IsNullOrEmpty(movieUser.PasswordSalt)))
                {
                    // For hardcoded admin accounts, check if the plain password matches
                    if (request.Password == movieUser.password)
                    {
                        // Password matches the plaintext password, generate token
                        var adminToken = GenerateJwtToken(movieUser);
                        return Ok(new LoginResponseDto { 
                            Token = adminToken, 
                            User = movieUser.ToUserInfoDto() 
                        });
                    }
                    else
                    {
                        _logger.LogWarning("Invalid password for hardcoded admin: {Email}", request.Email);
                        return Unauthorized(new { message = "Invalid email or password" });
                    }
                }

                // Verify Password with hash & salt
                debugStep = "verify-password";
                if (string.IsNullOrEmpty(movieUser.PasswordHash) || string.IsNullOrEmpty(movieUser.PasswordSalt))
                {
                    _logger.LogWarning("Password login attempt for user {UserId} failed: Missing hash or salt.", movieUser.user_id);
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                bool isPasswordValid = VerifyPassword(request.Password, movieUser.PasswordHash, movieUser.PasswordSalt);
                if (!isPasswordValid)
                {
                    _logger.LogWarning("Invalid password attempt for user: {Email}", request.Email);
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                // Generate token
                debugStep = "generate-token";
                var userToken = GenerateJwtToken(movieUser);

                debugStep = "create-response";
                // Return LoginResponseDto
                var userInfoDto = movieUser.ToUserInfoDto();
                return Ok(new LoginResponseDto
                {
                    Token = userToken,
                    User = userInfoDto
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login-with-password at step {Step}: {Message}", debugStep, ex.Message);
                return StatusCode(500, new { 
                    message = "An error occurred during login",
                    step = debugStep,
                    error = ex.Message
                });
            }
        }

        // Add missing test endpoints that are causing 405 errors
        [HttpGet("test-endpoint")]
        [AllowAnonymous]
        public IActionResult TestEndpoint()
        {
            return Ok(new { message = "API is working correctly" });
        }

        [HttpGet("debug-db")]
        [AllowAnonymous]
        public async Task<IActionResult> DebugDb()
        {
            try
            {
                // Test database connection by retrieving user count
                var userCount = await _context.Users.CountAsync();
                return Ok(new { 
                    message = "Database connection successful", 
                    userCount = userCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    message = "Database connection failed", 
                    error = ex.Message
                });
            }
        }

        [HttpGet("debug-login")]
        [AllowAnonymous]
        public async Task<IActionResult> DebugLogin([FromQuery] string email)
        {
            try
            {
                if (string.IsNullOrEmpty(email))
                {
                    return BadRequest(new { message = "Email parameter is required" });
                }

                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.email == email);

                if (user == null)
                {
                    return NotFound(new { message = $"User with email '{email}' not found" });
                }

                // For debugging purposes only, generate token without password check
                var debugToken = GenerateJwtToken(user);
                
                return Ok(new LoginResponseDto
                {
                    Token = debugToken,
                    User = user.ToUserInfoDto()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    message = "Debug login failed", 
                    error = ex.Message
                });
            }
        }

        // Add these endpoints for 2FA

        [HttpPost("enable-2fa")]
        [Authorize] // Require authentication
        public async Task<IActionResult> Enable2FA([FromBody] Enable2FARequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.PhoneNumber))
                {
                    return BadRequest(new { message = "Phone number is required." });
                }

                // Get the current user ID from claims - try both formats
                var userIdClaim = User.FindFirstValue("id");
                
                // If "id" claim is not found, try the standard NameIdentifier claim
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    _logger.LogInformation("Using ClaimTypes.NameIdentifier for user identification");
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("JWT token missing valid user ID claims: {Claims}", 
                        string.Join(", ", User.Claims.Select(c => $"{c.Type}:{c.Value}")));
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                _logger.LogInformation("Found user ID {UserId} in token claims", userId);

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User with ID {UserId} not found", userId);
                    return NotFound(new { message = "User not found." });
                }

                // Create payload for Stytch to start MFA enrollment
                var payload = new StringContent(
                    JsonSerializer.Serialize(new
                    {
                        phone_number = request.PhoneNumber
                    }),
                    Encoding.UTF8,
                    "application/json");

                // Call Stytch API to send SMS
                var response = await _httpClient.PostAsync("otps/sms/send", payload);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Stytch SMS OTP send failed: {StatusCode} - {Content}", 
                        response.StatusCode, content);
                    return StatusCode((int)response.StatusCode, new { message = "Failed to send verification code." });
                }

                // Parse Stytch response
                var stytchResponse = JsonSerializer.Deserialize<StytchSmsResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (stytchResponse?.MethodId == null)
                {
                    return BadRequest(new { message = "Invalid response from authentication provider." });
                }

                // Store method ID temporarily (would be better stored in a secure session)
                // In a production app, you would likely use a proper session store or encrypted cookie
                Response.Cookies.Append("methodId", stytchResponse.MethodId, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    MaxAge = TimeSpan.FromMinutes(10)
                });

                // Return success
                return Ok(new { 
                    message = "Verification code sent successfully.",
                    methodId = stytchResponse.MethodId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during 2FA enrollment");
                return StatusCode(500, new { message = "An error occurred during 2FA enrollment." });
            }
        }

        [HttpPost("verify-2fa")]
        [Authorize]
        public async Task<IActionResult> Verify2FA([FromBody] Verify2FARequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Code))
                {
                    return BadRequest(new { message = "Verification code is required." });
                }

                // Get method ID from cookie
                if (!Request.Cookies.TryGetValue("methodId", out string methodId) || string.IsNullOrEmpty(methodId))
                {
                    return BadRequest(new { message = "Method ID not found. Please restart the 2FA setup process." });
                }

                // Get the current user ID from claims - try both formats
                var userIdClaim = User.FindFirstValue("id");
                
                // If "id" claim is not found, try the standard NameIdentifier claim
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    _logger.LogInformation("Using ClaimTypes.NameIdentifier for user identification");
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("JWT token missing valid user ID claims: {Claims}", 
                        string.Join(", ", User.Claims.Select(c => $"{c.Type}:{c.Value}")));
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                _logger.LogInformation("Found user ID {UserId} in token claims", userId);

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User with ID {UserId} not found", userId);
                    return NotFound(new { message = "User not found." });
                }

                // Create payload for Stytch to verify OTP
                var payload = new StringContent(
                    JsonSerializer.Serialize(new
                    {
                        method_id = methodId,
                        code = request.Code
                    }),
                    Encoding.UTF8,
                    "application/json");

                // Call Stytch API to verify code
                var response = await _httpClient.PostAsync("otps/authenticate", payload);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Stytch OTP authentication failed: {StatusCode} - {Content}", 
                        response.StatusCode, content);
                    return StatusCode((int)response.StatusCode, new 
                    { 
                        message = response.StatusCode == System.Net.HttpStatusCode.BadRequest 
                            ? "Invalid verification code." 
                            : "Failed to verify code." 
                    });
                }

                // Parse Stytch response
                var stytchResponse = JsonSerializer.Deserialize<StytchAuthenticateResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (stytchResponse?.AuthenticateSuccess != true)
                {
                    return BadRequest(new { message = "Verification failed." });
                }

                // Update user with 2FA info
                user.HasMfaEnabled = true;
                user.MfaPhoneNumber = request.PhoneNumber;
                await _context.SaveChangesAsync();

                // Clear the method ID cookie
                Response.Cookies.Delete("methodId");

                // Return success
                return Ok(new { message = "Two-factor authentication enabled successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying 2FA code");
                return StatusCode(500, new { message = "An error occurred while verifying the code." });
            }
        }

        // Add this endpoint to check 2FA status
        [HttpGet("2fa-status")]
        [Authorize]
        public async Task<IActionResult> Get2FAStatus()
        {
            try
            {
                // Get the current user ID from claims - try both formats
                var userIdClaim = User.FindFirstValue("id");
                
                // If "id" claim is not found, try the standard NameIdentifier claim
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    _logger.LogInformation("Using ClaimTypes.NameIdentifier for user identification");
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("JWT token missing valid user ID claims: {Claims}", 
                        string.Join(", ", User.Claims.Select(c => $"{c.Type}:{c.Value}")));
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                _logger.LogInformation("Found user ID {UserId} in token claims", userId);

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User with ID {UserId} not found", userId);
                    return NotFound(new { message = "User not found." });
                }

                return Ok(new { 
                    enabled = user.HasMfaEnabled.GetValueOrDefault(false),
                    phoneNumber = user.MfaPhoneNumber ?? string.Empty
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting 2FA status");
                return StatusCode(500, new { message = "An error occurred while getting 2FA status." });
            }
        }

        // Add this endpoint to disable 2FA
        [HttpPost("disable-2fa")]
        [Authorize]
        public async Task<IActionResult> Disable2FA()
        {
            try
            {
                // Get the current user ID from claims - try both formats
                var userIdClaim = User.FindFirstValue("id");
                
                // If "id" claim is not found, try the standard NameIdentifier claim
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    _logger.LogInformation("Using ClaimTypes.NameIdentifier for user identification");
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("JWT token missing valid user ID claims: {Claims}", 
                        string.Join(", ", User.Claims.Select(c => $"{c.Type}:{c.Value}")));
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                _logger.LogInformation("Found user ID {UserId} in token claims", userId);

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                // Disable 2FA
                user.HasMfaEnabled = false;
                user.MfaPhoneNumber = null;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Two-factor authentication disabled successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disabling 2FA");
                return StatusCode(500, new { message = "An error occurred while disabling 2FA." });
            }
        }

        // Add this endpoint to debug JWT token claims
        [HttpGet("debug-jwt")]
        [Authorize]
        public IActionResult DebugJwtToken()
        {
            try
            {
                // Get all claims from the current token
                var claims = User.Claims.Select(c => new { Type = c.Type, Value = c.Value }).ToList();
                
                // Specifically look for the "id" claim
                var userIdClaim = User.FindFirstValue("id");
                var nameIdentifierClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                
                return Ok(new
                {
                    message = "JWT token debug information",
                    hasIdClaim = !string.IsNullOrEmpty(userIdClaim),
                    idClaimValue = userIdClaim,
                    nameIdentifierValue = nameIdentifierClaim,
                    isAuthenticated = User.Identity?.IsAuthenticated ?? false,
                    allClaims = claims
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during JWT token debugging");
                return StatusCode(500, new { message = "An error occurred during JWT debugging." });
            }
        }

        // Mock 2FA functionality for testing/demo purposes
        [HttpPost]
        [Route("mock-enable-2fa")]
        [Authorize]
        public async Task<IActionResult> MockEnable2FA([FromBody] Enable2FARequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.PhoneNumber))
                {
                    return BadRequest(new { message = "Phone number is required." });
                }

                // Get the current user ID using the same approach as the real endpoint
                var userIdClaim = User.FindFirstValue("id");
                
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    _logger.LogInformation("Using ClaimTypes.NameIdentifier for user identification");
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("JWT token missing valid user ID claims: {Claims}", 
                        string.Join(", ", User.Claims.Select(c => $"{c.Type}:{c.Value}")));
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User with ID {UserId} not found", userId);
                    return NotFound(new { message = "User not found." });
                }

                // For mock purposes, we'll store a simulated verification code in a cookie
                // In a real system, this would be sent via SMS
                // Always use 123456 as the mock verification code
                const string mockVerificationCode = "123456";
                
                // Generate a fake method ID (to mimic Stytch's response)
                string methodId = Guid.NewGuid().ToString();
                
                // Store the method ID and phone number in cookies
                Response.Cookies.Append("methodId", methodId, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    MaxAge = TimeSpan.FromMinutes(10)
                });
                
                // Log for demo purposes
                _logger.LogInformation("MOCK 2FA: Verification code for {PhoneNumber} is {Code}", 
                    request.PhoneNumber, mockVerificationCode);

                // Return a mock success response
                return Ok(new { 
                    message = "Verification code sent successfully (mock). Use code: 123456",
                    methodId = methodId,
                    mockCode = mockVerificationCode // Only in mock version - would not exist in real version
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during mock 2FA enrollment");
                return StatusCode(500, new { message = "An error occurred during 2FA enrollment." });
            }
        }

        // Mock version of 2FA verification
        [HttpPost]
        [Route("mock-verify-2fa")]
        [Authorize]
        public async Task<IActionResult> MockVerify2FA([FromBody] Verify2FARequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Code))
                {
                    return BadRequest(new { message = "Verification code is required." });
                }

                // Check if the code is the mock code (123456)
                if (request.Code != "123456")
                {
                    return BadRequest(new { message = "Invalid verification code." });
                }

                // Get the method ID from cookie
                if (!Request.Cookies.TryGetValue("methodId", out string methodId) || string.IsNullOrEmpty(methodId))
                {
                    return BadRequest(new { message = "Method ID not found. Please restart the 2FA setup process." });
                }

                // Get the current user ID
                var userIdClaim = User.FindFirstValue("id");
                
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                }
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return BadRequest(new { message = "Valid user ID not found in token claims." });
                }

                // Get user from database
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                // Update user with 2FA info
                user.HasMfaEnabled = true;
                user.MfaPhoneNumber = request.PhoneNumber;
                await _context.SaveChangesAsync();

                // Clear the method ID cookie
                Response.Cookies.Delete("methodId");

                // Return success
                return Ok(new { message = "Two-factor authentication enabled successfully (mock)." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying mock 2FA code");
                return StatusCode(500, new { message = "An error occurred while verifying the code." });
            }
        }

        // Simple test endpoint for 2FA functionality
        [HttpGet]
        [Route("test-2fa")]
        [AllowAnonymous]
        public IActionResult Test2FA()
        {
            return Ok(new { message = "2FA test endpoint is working!" });
        }
    }
}
