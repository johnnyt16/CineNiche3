using Azure.Storage.Blobs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using System.Web;

[ApiController]
[Route("api/[controller]")]
public class PostersController : ControllerBase
{
    private readonly BlobContainerClient _containerClient;
    private readonly string _baseUrl;
    private static List<string> _cachedPosterUrls = null;
    private static readonly SemaphoreSlim _cacheLock = new SemaphoreSlim(1, 1);
    private static DateTime _lastCacheUpdate = DateTime.MinValue;
    private static readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

    public PostersController(IConfiguration config)
    {
        string connectionString = config["AzureBlobStorage:ConnectionString"];
        string containerName = config["AzureBlobStorage:ContainerName"];
        _baseUrl = config["AzureBlobStorage:BaseUrl"];
        
        // Ensure the base URL ends with a trailing slash for proper URL construction
        if (!string.IsNullOrEmpty(_baseUrl) && !_baseUrl.EndsWith("/"))
        {
            _baseUrl += "/";
        }

        _containerClient = new BlobContainerClient(connectionString, containerName);
    }

    [HttpGet]
    public async Task<IActionResult> GetPosters()
    {
        try 
        {
            var posterUrls = await GetCachedPosterUrls();
            return Ok(posterUrls);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting posters: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve posters" });
        }
    }

    [HttpGet("{*title}")]
    public async Task<IActionResult> GetPosterByTitle(string title)
    {
        if (string.IsNullOrEmpty(title))
        {
            return BadRequest(new { error = "Movie title cannot be empty" });
        }
        
        try
        {
            // Decode the URI-encoded title
            string decodedTitle = HttpUtility.UrlDecode(title);
            
            var posterUrls = await GetCachedPosterUrls();
            
            // For logging and debugging
            Console.WriteLine($"Looking for poster with title: '{decodedTitle}' among {posterUrls.Count} posters");
            
            // Try multiple matching strategies
            string matchedUrl = FindBestMatchingPoster(decodedTitle, posterUrls);
            
            if (matchedUrl != null)
            {
                return Ok(new { url = matchedUrl });
            }
            
            // If we get here, return all posters as a last resort
            Console.WriteLine($"No match found for '{decodedTitle}', returning all posters");
            return Ok(posterUrls);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing request for '{title}': {ex.Message}");
            return StatusCode(500, new { error = $"Failed to process request: {ex.Message}" });
        }
    }
    
    // Helper method to find the best matching poster using multiple strategies
    private string FindBestMatchingPoster(string title, List<string> posterUrls)
    {
        // Normalize the title
        string normalizedTitle = title.Trim();
        
        Console.WriteLine($"Detailed matching for title: '{normalizedTitle}'");
        
        // Helper function to get just the filename part of the URL
        string GetFileName(string url)
        {
            return url.Split('/').Last();
        }
        
        // Helper function to check if url contains a specific title as an exact match
        bool IsExactBoundaryMatch(string url, string searchTitle)
        {
            string urlLower = url.ToLower();
            string searchTitleLower = searchTitle.ToLower();
            string fileNameOnly = GetFileName(urlLower);
            
            // Check for exact match or boundary match
            return urlLower.Contains($"/{searchTitleLower}.") || 
                   urlLower.Contains($"/{searchTitleLower}/") ||
                   fileNameOnly == searchTitleLower ||
                   fileNameOnly.StartsWith($"{searchTitleLower}.") ||
                   urlLower.Contains($"movie posters/{searchTitleLower}.");
        }
        
        // Priority 1: Special handling for apostrophe-starting titles
        if (normalizedTitle.StartsWith("'"))
        {
            string titleWithoutApostrophe = normalizedTitle.Substring(1);
            Console.WriteLine($"Apostrophe-start title detected. Trying: '{normalizedTitle}' and '{titleWithoutApostrophe}'");
            
            // Try exact match with apostrophe first
            var exactApostropheMatch = posterUrls.FirstOrDefault(url => 
                IsExactBoundaryMatch(url, normalizedTitle));
            
            if (exactApostropheMatch != null)
            {
                Console.WriteLine($"Found exact apostrophe match for '{normalizedTitle}': {exactApostropheMatch}");
                return exactApostropheMatch;
            }
            
            // Then try without the apostrophe
            var withoutApostropheMatch = posterUrls.FirstOrDefault(url => 
                IsExactBoundaryMatch(url, titleWithoutApostrophe));
            
            if (withoutApostropheMatch != null)
            {
                Console.WriteLine($"Found match without apostrophe for '{normalizedTitle}': {withoutApostropheMatch}");
                return withoutApostropheMatch;
            }
            
            // Looser matching for apostrophe titles as a last resort
            var looseApostropheMatch = posterUrls.FirstOrDefault(url => 
                url.ToLower().Contains(normalizedTitle.ToLower()) || 
                url.ToLower().Contains(titleWithoutApostrophe.ToLower()));
            
            if (looseApostropheMatch != null)
            {
                Console.WriteLine($"Found loose match for apostrophe title '{normalizedTitle}': {looseApostropheMatch}");
                return looseApostropheMatch;
            }
        }
        
        // Priority 2: Handle # prefix in titles
        string titleWithoutHash = normalizedTitle;
        string titleWithHash = normalizedTitle;
        
        if (normalizedTitle.StartsWith("#"))
        {
            titleWithoutHash = normalizedTitle.Substring(1);
            Console.WriteLine($"Hash title detected. Trying: '{normalizedTitle}' and '{titleWithoutHash}'");
        }
        else
        {
            titleWithHash = "#" + normalizedTitle;
        }
        
        // Try exact matches first
        var directMatch = posterUrls.FirstOrDefault(url => 
            IsExactBoundaryMatch(url, normalizedTitle));
        
        if (directMatch != null)
        {
            Console.WriteLine($"Found exact boundary match for '{normalizedTitle}': {directMatch}");
            return directMatch;
        }
        
        // Try hash variants
        var hashMatch = posterUrls.FirstOrDefault(url => 
            IsExactBoundaryMatch(url, titleWithoutHash) || 
            IsExactBoundaryMatch(url, titleWithHash));
        
        if (hashMatch != null)
        {
            Console.WriteLine($"Found hash variant match for '{normalizedTitle}': {hashMatch}");
            return hashMatch;
        }
        
        // Priority 3: Special handling for sequels
        var sequelRegex = new Regex(@"^(.+?)[\s\:]+(\d+|[IVXivx]+)$");
        var sequelMatch = sequelRegex.Match(normalizedTitle);
        
        if (sequelMatch.Success)
        {
            string baseName = sequelMatch.Groups[1].Value.Trim();
            string sequelNumber = sequelMatch.Groups[2].Value.Trim();
            
            Console.WriteLine($"Sequel detected: Base='{baseName}', Number='{sequelNumber}'");
            
            // Look for exact match first (highest priority)
            var exactSequelMatch = posterUrls.FirstOrDefault(url =>
                IsExactBoundaryMatch(url, normalizedTitle) || 
                (normalizedTitle.StartsWith("#") 
                    ? IsExactBoundaryMatch(url, titleWithoutHash) 
                    : IsExactBoundaryMatch(url, titleWithHash)));
            
            if (exactSequelMatch != null)
            {
                Console.WriteLine($"Found exact match for sequel '{normalizedTitle}': {exactSequelMatch}");
                return exactSequelMatch;
            }
            
            // Look for boundary matches with both components in the filename
            var sequelBoundaryMatches = posterUrls.Where(url => {
                string fileName = GetFileName(url.ToLower());
                string baseNameLower = baseName.ToLower();
                string sequelNumberLower = sequelNumber.ToLower();
                
                return fileName.Contains($"{baseNameLower} {sequelNumberLower}") || 
                       fileName.Contains($"{baseNameLower}{sequelNumberLower}");
            }).ToList();
            
            if (sequelBoundaryMatches.Any())
            {
                var bestMatch = sequelBoundaryMatches.First();
                Console.WriteLine($"Found boundary match for sequel '{normalizedTitle}': {bestMatch}");
                return bestMatch;
            }
        }
        
        // Priority 4: For non-sequels, make sure we don't match sequels
        if (!sequelMatch.Success)
        {
            var nonSequelMatches = posterUrls.Where(url => {
                string fileName = GetFileName(url.ToLower());
                string titleLower = normalizedTitle.ToLower();
                
                // Check for exact match
                if (fileName == titleLower || fileName.StartsWith($"{titleLower}."))
                {
                    return true;
                }
                
                // Make sure no numbers or roman numerals follow the title
                var hasSequelIndicator = Regex.IsMatch(fileName, @"[\s\:]+(\d+|ii|iii|iv|v|vi|vii|viii|ix|x)\b", RegexOptions.IgnoreCase);
                
                return fileName.Contains(titleLower) && !hasSequelIndicator;
            }).ToList();
            
            if (nonSequelMatches.Any())
            {
                var bestNonSequelMatch = nonSequelMatches.First();
                Console.WriteLine($"Found non-sequel match for '{normalizedTitle}': {bestNonSequelMatch}");
                return bestNonSequelMatch;
            }
        }
        
        // Priority 5: Try with cleaned title (remove special characters)
        string cleanedTitle = new string(normalizedTitle.Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)).ToArray());
        
        // Try boundary match with cleaned title
        var cleanedBoundaryMatch = posterUrls.FirstOrDefault(url => 
            IsExactBoundaryMatch(url, cleanedTitle));
        
        if (cleanedBoundaryMatch != null)
        {
            Console.WriteLine($"Found boundary match with cleaned title '{cleanedTitle}': {cleanedBoundaryMatch}");
            return cleanedBoundaryMatch;
        }
        
        // Priority 6: Looser matching as a last resort
        var looseMatch = posterUrls.FirstOrDefault(url => 
            url.ToLower().Contains(normalizedTitle.ToLower()));
        
        if (looseMatch != null)
        {
            Console.WriteLine($"Found loose match for '{normalizedTitle}': {looseMatch}");
            return looseMatch;
        }
        
        // Priority 7: Word-by-word matching
        var titleWords = cleanedTitle
            .Split(new[] { ' ', '-', ':', '_', '.', ',' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3)
            .OrderByDescending(w => w.Length) // Longest words first
            .ToArray();
            
        foreach (var word in titleWords)
        {
            var wordMatch = posterUrls.FirstOrDefault(url => 
                url.ToLower().Contains(word.ToLower()));
                
            if (wordMatch != null)
            {
                Console.WriteLine($"Found word match '{word}' for '{normalizedTitle}': {wordMatch}");
                return wordMatch;
            }
        }
        
        // No match found
        Console.WriteLine($"No match found for '{normalizedTitle}'");
        return null;
    }
    
    // Helper method to get cached posters
    private async Task<List<string>> GetCachedPosterUrls()
    {
        // Check if cache needs refresh
        if (_cachedPosterUrls == null || DateTime.UtcNow - _lastCacheUpdate > _cacheExpiration)
        {
            await _cacheLock.WaitAsync();
            try
            {
                // Double-check after acquiring lock
                if (_cachedPosterUrls == null || DateTime.UtcNow - _lastCacheUpdate > _cacheExpiration)
                {
                    Console.WriteLine("Refreshing poster URL cache...");
                    var newUrls = new List<string>();
                    
                    await foreach (var blobItem in _containerClient.GetBlobsAsync())
                    {
                        newUrls.Add($"{_baseUrl}{blobItem.Name}");
                    }
                    
                    _cachedPosterUrls = newUrls;
                    _lastCacheUpdate = DateTime.UtcNow;
                    Console.WriteLine($"Cache refreshed with {_cachedPosterUrls.Count} poster URLs");
                }
            }
            finally
            {
                _cacheLock.Release();
            }
        }
        
        return _cachedPosterUrls;
    }
}
