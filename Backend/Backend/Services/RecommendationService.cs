// RecommendationService.cs
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CineNiche.API.Data;
using CineNiche.API.Models;
using CsvHelper;
using Microsoft.EntityFrameworkCore;

namespace CineNiche.API.Services
{
    public class RecommendationService
    {
        private readonly MoviesDbContext _context;
        private readonly List<CollaborativeRecommendation> _collabRecs;

        public RecommendationService(MoviesDbContext context)
        {
            _context = context;

            // Load collaborative recommendations from CSV
            using var reader = new StreamReader("SeedData/collab.csv");
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            _collabRecs = csv.GetRecords<CollaborativeRecommendation>().ToList();
        }

        // Content-based filtering
        public async Task<List<MovieTitle>> GetContentBasedRecommendations(string showId, int count = 10)
        {
            var targetMovie = await _context.Movies.FindAsync(showId);
            if (targetMovie == null) return new List<MovieTitle>();

            var allMovies = await _context.Movies
                .Where(m => m.show_id != showId)
                .ToListAsync();

            var targetCategories = targetMovie.ActiveCategories;

            var similarMovies = allMovies
                .Select(m => new
                {
                    Movie = m,
                    SimilarityScore = CalculateGenreSimilarity(targetCategories, m.ActiveCategories)
                })
                .OrderByDescending(x => x.SimilarityScore)
                .Take(count)
                .Select(x => x.Movie)
                .ToList();

            return similarMovies;
        }

        private double CalculateGenreSimilarity(List<string> genres1, List<string> genres2)
        {
            if (!genres1.Any() || !genres2.Any()) return 0;

            var intersection = genres1.Intersect(genres2).Count();
            var union = genres1.Union(genres2).Count();

            return union == 0 ? 0 : (double)intersection / union;
        }

        // Hybrid recommendation combining content-based and user behavior
        public async Task<List<MovieTitle>> GetHybridRecommendations(string showId, int? userId = null, int count = 10)
        {
            var contentBased = await GetContentBasedRecommendations(showId, count * 2);

            if (userId.HasValue)
            {
                var userRatings = await _context.Ratings
                    .Where(r => r.user_id == userId)
                    .ToListAsync();

                var ratedMovieIds = userRatings.Select(r => r.show_id).ToList();

                contentBased = contentBased
                    .OrderByDescending(m => ratedMovieIds.Contains(m.show_id) ? 1 : 0)
                    .Take(count)
                    .ToList();
            }

            return contentBased.Take(count).ToList();
        }

        // NEW: Collaborative filtering from collab.csv
        public List<string> GetTopCollaborativeShowIdsForUser(int userId, int topN = 30)
        {
            return _collabRecs
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.PredictedRating)
                .Take(topN)
                .Select(r => r.ShowId)
                .ToList();
        }
    }
}
