// Models/MovieRating.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class MovieRating
{
    [Key, Column(Order = 1)]
    public int user_id { get; set; } // Part of composite key - required
    
    [Key, Column(Order = 2)]
    public string show_id { get; set; } = null!; // Part of composite key - required
    
    public decimal? rating { get; set; } // Made nullable
    
    public string? review { get; set; } // Optional review text
}