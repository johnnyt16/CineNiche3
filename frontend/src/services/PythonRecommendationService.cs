// Services/PythonRecommendationService.cs
using System.Diagnostics;
using System.Text.Json;

public class PythonRecommendationService
{
    private readonly IConfiguration _configuration;
    private readonly string _pythonPath;
    private readonly string _scriptPath;

    public PythonRecommendationService(IConfiguration configuration)
    {
        _configuration = configuration;
        _pythonPath = _configuration["PythonPath"] ?? "python";
        _scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "RecommendationEngine", "pipelineforAPI.py");
    }

    public async Task<List<string>> GetHybridRecommendations(string showId)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = _pythonPath,
                Arguments = $"\"{_scriptPath}\" \"{showId}\"",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                throw new Exception("Failed to start Python process");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                throw new Exception($"Python script exited with code {process.ExitCode}");
            }

            var recommendations = JsonSerializer.Deserialize<List<string>>(output);
            return recommendations ?? new List<string>();
        }
        catch (Exception ex)
        {
            // Log error
            Console.WriteLine($"Error getting recommendations: {ex.Message}");
            return new List<string>();
        }
    }
}