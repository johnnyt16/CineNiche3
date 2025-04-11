using CineNiche.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using System.Text.Json;
using Microsoft.Extensions.Options;
// using CineNiche.API.Models; // Ensure this is removed/commented
// using CineNiche.API.Models.Stytch; // Ensure this is removed/commented
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Models;
using CineNiche.API.DTOs;
// using Microsoft.AspNetCore.HttpsPolicy; // Remove HTTPS policy reference
using CineNiche.API.Services;
using Microsoft.AspNetCore.Diagnostics;
using System.Net;

var builder = WebApplication.CreateBuilder(args);

// Force disable HTTPS entirely
builder.WebHost.UseUrls("http://0.0.0.0:" + (Environment.GetEnvironmentVariable("PORT") ?? "80"));

// Add configuration
builder.Configuration.AddJsonFile("appsettings.json");
builder.Configuration.AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true);
builder.Configuration.AddEnvironmentVariables();

// Explicitly configure Kestrel to use HTTP only
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    // Force HTTP only
    serverOptions.ListenAnyIP(int.Parse(Environment.GetEnvironmentVariable("PORT") ?? "80"));
    // Disable HTTPS entirely
    serverOptions.Configure();
});

builder.Services.AddScoped<RecommendationService>(); 

// Configure Database with better path handling
var connectionString = builder.Configuration.GetConnectionString("MoviesDb");
string dbPath = connectionString;

// If we're using a relative path, ensure it's resolved correctly
if (connectionString.Contains("./") || connectionString.Contains("../"))
{
    // For relative paths, resolve against ContentRootPath
    string relativePath = connectionString.Replace("Data Source=", "");
    dbPath = $"Data Source={Path.Combine(builder.Environment.ContentRootPath, relativePath)}";
    Console.WriteLine($"Resolved database path: {dbPath}");

    // Make sure the directory exists
    string dbDir = Path.GetDirectoryName(Path.Combine(builder.Environment.ContentRootPath, relativePath));
    if (!Directory.Exists(dbDir))
    {
        Console.WriteLine($"Creating database directory: {dbDir}");
        Directory.CreateDirectory(dbDir);
    }
}
else
{
    Console.WriteLine($"Using database path as-is: {dbPath}");
}

// Add services to the container
builder.Services.AddDbContext<MoviesDbContext>(options =>
    options.UseSqlite(dbPath));

// Configure JSON serialization
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        // Use camelCase for property names to match JavaScript conventions
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        // Include all properties in serialization
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        // Enable property name case-insensitive matching for deserialization
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// HTTPS configuration completely removed

// Add CORS with a more permissive policy
builder.Services.AddCors(options =>
{
    // Default policy
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });

    // Named policy for specific origins if needed
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "https://localhost:3000",
                "https://localhost:5173",
                "https://cineniche-fkazataxamgph8bu.eastus-01.azurewebsites.net",
                "https://cineniche-91c50.web.app",
                "https://cineniche-91c50.firebaseapp.com",
                "https://cineniche3.onrender.com"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Configure Stytch
builder.Services.Configure<StytchConfig>(builder.Configuration.GetSection("Stytch"));

// Register the HttpClient named "StytchClient" 
builder.Services.AddHttpClient<IStytchClient, StytchClient>();

// Add JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]))
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Add exception handling middleware FIRST
app.UseExceptionHandler(appError =>
{
    appError.Run(async context =>
    {
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/json";
        
        var contextFeature = context.Features.Get<IExceptionHandlerFeature>();
        if (contextFeature != null)
        {
            // Log the error
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            logger.LogError(contextFeature.Error, "Unhandled exception");
            
            // Return error details in development, simple message in production
            var response = builder.Environment.IsDevelopment()
                ? new { 
                    StatusCode = context.Response.StatusCode,
                    Message = "Internal Server Error",
                    Details = contextFeature.Error.ToString()
                }
                : new { 
                    StatusCode = context.Response.StatusCode,
                    Message = "Internal Server Error"
                };
                
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    });
});

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// HSTS completely removed

// Use CORS at the beginning of the pipeline
// Use the default policy which allows any origin
app.UseCors();

// Add Content-Security-Policy middleware
app.Use(async (context, next) =>
{
    try
    {
        // Define CSP policies
        context.Response.Headers.Add("Content-Security-Policy", 
            "default-src 'self';" +
            "img-src 'self' https://postersintex.blob.core.windows.net data:;" +
            "style-src 'self' https://fonts.googleapis.com 'unsafe-inline';" +
            "font-src 'self' https://fonts.gstatic.com;" +
            "script-src 'self' 'unsafe-inline';" + 
            "connect-src 'self' * https://localhost:* http://localhost:* https://cineniche-91c50.web.app https://cineniche-91c50.firebaseapp.com;" +
            "frame-ancestors 'none';" +
            "form-action 'self';" +
            "base-uri 'self';" +
            "object-src 'none'");

        // Add other security headers
        context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Add("X-Frame-Options", "DENY");
        context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Add("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        
        await next();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error in middleware: {ex.Message}");
        throw;
    }
});

// HTTPS redirection completely removed

// Add authentication middleware before authorization
app.UseAuthentication();
app.UseAuthorization();

// Map health check endpoint
app.MapHealthChecks("/health");

app.MapControllers();
app.Run();
