using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Net.Http.Json;

namespace Backend.Models
{
    public interface IStytchClient
    {
        Task<AuthResult> AuthenticateOAuthAsync(string token);
        Task<AuthResult> AuthenticateSessionAsync(string sessionToken);
        Task<AuthResult> AuthenticatePasswordAsync(string email, string password);
        Task<bool> RevokeSessionAsync(string sessionToken);
    }

    public class StytchClient : IStytchClient
    {
        private readonly ILogger<StytchClient> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _projectId;
        private readonly string _secret;

        public StytchClient(HttpClient httpClient, ILogger<StytchClient> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            
            // Get Stytch credentials from configuration
            _projectId = configuration["Stytch:ProjectID"];
            _secret = configuration["Stytch:Secret"];
            
            // Configure HTTP client with basic auth using project ID and secret
            var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_projectId}:{_secret}"));
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            
            // Get base URL from config or use default
            var baseUrl = configuration["Stytch:BaseUrl"] ?? "https://test.stytch.com/v1/";
            _httpClient.BaseAddress = new Uri(baseUrl);
        }

        /// <summary>
        /// Authenticates a user using OAuth token
        /// </summary>
        /// <param name="token">The OAuth token from a provider like Google, GitHub, etc.</param>
        /// <returns>Authentication result containing user details</returns>
        public async Task<AuthResult> AuthenticateOAuthAsync(string token)
        {
            try
            {
                var requestPayload = new { token = token };
                var response = await _httpClient.PostAsJsonAsync("oauth/authenticate", requestPayload);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Stytch OAuth authentication failed: {StatusCode} - {ErrorContent}", 
                        response.StatusCode, errorContent);
                    return new AuthResult { Success = false, ErrorMessage = errorContent };
                }

                var content = await response.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<StytchResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                return new AuthResult
                {
                    Success = true,
                    UserId = responseData.UserId,
                    Email = responseData.User?.Emails?.FirstOrDefault()?.Email ?? string.Empty,
                    SessionToken = responseData.SessionToken,
                    SessionExpiresAt = responseData.Session?.ExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during OAuth authentication");
                return new AuthResult { Success = false, ErrorMessage = "An unexpected error occurred" };
            }
        }

        /// <summary>
        /// Authenticates a session token
        /// </summary>
        /// <param name="sessionToken">The Stytch session token</param>
        /// <returns>Authentication result containing user details</returns>
        public async Task<AuthResult> AuthenticateSessionAsync(string sessionToken)
        {
            try
            {
                var requestPayload = new { session_token = sessionToken };
                var response = await _httpClient.PostAsJsonAsync("sessions/authenticate", requestPayload);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Stytch Session authentication failed: {StatusCode} - {ErrorContent}", 
                        response.StatusCode, errorContent);
                    return new AuthResult { Success = false, ErrorMessage = errorContent };
                }

                var content = await response.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<StytchResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                return new AuthResult
                {
                    Success = true,
                    UserId = responseData.User.UserId,
                    Email = responseData.User?.Emails?.FirstOrDefault()?.Email ?? string.Empty,
                    SessionToken = responseData.SessionToken,
                    SessionExpiresAt = responseData.Session.ExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during session authentication");
                return new AuthResult { Success = false, ErrorMessage = "An unexpected error occurred" };
            }
        }

        /// <summary>
        /// Authenticates a user using email and password
        /// </summary>
        /// <param name="email">User's email</param>
        /// <param name="password">User's password</param>
        /// <returns>Authentication result containing user details</returns>
        public async Task<AuthResult> AuthenticatePasswordAsync(string email, string password)
        {
            try
            {
                var requestPayload = new { email = email, password = password };
                var response = await _httpClient.PostAsJsonAsync("passwords/authenticate", requestPayload);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Stytch Password authentication failed: {StatusCode} - {ErrorContent}", 
                        response.StatusCode, errorContent);
                    return new AuthResult { Success = false, ErrorMessage = errorContent };
                }

                var content = await response.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<StytchResponse>(content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                return new AuthResult
                {
                    Success = true,
                    UserId = responseData.User.UserId,
                    Email = responseData.User?.Emails?.FirstOrDefault()?.Email ?? string.Empty,
                    SessionToken = responseData.SessionToken,
                    SessionExpiresAt = responseData.Session.ExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password authentication");
                return new AuthResult { Success = false, ErrorMessage = "An unexpected error occurred" };
            }
        }

        /// <summary>
        /// Revokes a session token
        /// </summary>
        /// <param name="sessionToken">The Stytch session token to revoke</param>
        /// <returns>True if successfully revoked, false otherwise</returns>
        public async Task<bool> RevokeSessionAsync(string sessionToken)
        {
            try
            {
                var requestPayload = new { session_token = sessionToken };
                var response = await _httpClient.PostAsJsonAsync("sessions/revoke", requestPayload);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Stytch Session revocation failed: {StatusCode} - {ErrorContent}", 
                        response.StatusCode, errorContent);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking session");
                return false;
            }
        }
    }

    /// <summary>
    /// Represents the result of an authentication attempt
    /// </summary>
    public class AuthResult
    {
        public bool Success { get; set; }
        public string UserId { get; set; }
        public string Email { get; set; }
        public string SessionToken { get; set; }
        public DateTime? SessionExpiresAt { get; set; }
        public string ErrorMessage { get; set; }
    }

    /// <summary>
    /// Model for deserializing Stytch API responses
    /// </summary>
    public class StytchResponse
    {
        public string UserId { get; set; }
        public string SessionToken { get; set; }
        public StytchUser User { get; set; }
        public StytchSession Session { get; set; }
        public int StatusCode { get; set; }
    }

    public class StytchUser
    {
        public string UserId { get; set; }
        public string Name { get; set; }
        public List<StytchEmail> Emails { get; set; }
    }

    public class StytchEmail
    {
        public string Email { get; set; }
        public bool Verified { get; set; }
    }

    public class StytchSession
    {
        public DateTime ExpiresAt { get; set; }
    }
}