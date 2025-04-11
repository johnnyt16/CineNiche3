// Models/MovieTitle.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class MovieTitle
{
    [Key]
    public string show_id { get; set; } = null!; // Primary key - required
    
    public string? type { get; set; }
    public string? title { get; set; } // Changed back to nullable to match DB schema
    public string? director { get; set; }
    public string? cast { get; set; }
    public string? country { get; set; }
    public int? release_year { get; set; } // Made nullable
    public string? rating { get; set; }
    public string? duration { get; set; }
    public string? description { get; set; }
    
    // For your genre boolean columns (example for a few)
    public bool? Action { get; set; }
    public bool? Adventure { get; set; }
    public bool? Anime_Series_International_TV_Shows { get; set; }
    public bool? British_TV_Shows_Docuseries_International_TV_Shows { get; set; }
    public bool? Children { get; set; }
    public bool? Comedies { get; set; }
    public bool? Comedies_Dramas_International_Movies { get; set; }
    public bool? Comedies_International_Movies { get; set; }
    public bool? Comedies_Romantic_Movies { get; set; }
    public bool? Crime_TV_Shows_Docuseries { get; set; }
    public bool? Documentaries { get; set; }
    public bool? Documentaries_International_Movies { get; set; }
    public bool? Docuseries { get; set; }
    public bool? Dramas { get; set; }
    public bool? Dramas_International_Movies { get; set; }
    public bool? Dramas_Romantic_Movies { get; set; }
    public bool? Family_Movies { get; set; }
    public bool? Fantasy { get; set; }
    public bool? Horror_Movies { get; set; }
    public bool? International_Movies_Thrillers { get; set; }
    public bool? International_TV_Shows_Romantic_TV_Shows_TV_Dramas  { get; set; }
    public bool? Kids_TV { get; set; }
    public bool? Language_TV_Shows { get; set; }
    public bool? Musicals { get; set; }
    public bool? Nature_TV { get; set; }
    public bool? Reality_TV { get; set; }
    public bool? Spirituality { get; set; }
    public bool? TV_Action { get; set; }
    public bool? TV_Comedies { get; set; }
    public bool? TV_Dramas { get; set; }
    public bool? Talk_Shows_TV_Comedies { get; set; }
    public bool? Thrillers { get; set; }

    [NotMapped]
    public List<string> ActiveCategories
    {
        get
        {
            var categories = new List<string>();
            if (Action == true) categories.Add("Action");
            if (Adventure == true) categories.Add("Adventure");
            if (Anime_Series_International_TV_Shows == true)
            {
                categories.Add("Anime Series");
                categories.Add("International");
            }

            if (British_TV_Shows_Docuseries_International_TV_Shows == true)
            {
                categories.Add("Docuseries");
                categories.Add("International");
            }
            if (Children == true) categories.Add("Children");
            if (Comedies == true) categories.Add("Comedies");
            if (Comedies_Dramas_International_Movies == true)
            {
                categories.Add("Comedies");
                categories.Add("International");
                categories.Add("Dramas");
            }

            if (Comedies_International_Movies == true)
            {
                categories.Add("Comedies");
                categories.Add("International");
            }

            if (Comedies_Romantic_Movies == true)
            {
                categories.Add("Romantic Comedies");
                categories.Add("Comedies");
                categories.Add("Romance");
            }

            if (Crime_TV_Shows_Docuseries == true)
            {
                categories.Add("Crime");
                categories.Add("Docuseries");
            }
            if (Documentaries == true) categories.Add("Documentaries");
            if (Documentaries_International_Movies == true)
            {
                categories.Add("Documentaries");
                categories.Add("International");
            }
            if (Docuseries == true) categories.Add("Docuseries");
            if (Dramas == true) categories.Add("Dramas");
            if (Dramas_International_Movies == true)
            {
                categories.Add("Dramas");
                categories.Add("International");
            }

            if (Dramas_Romantic_Movies == true)
            {
                categories.Add("Dramas");
                categories.Add("Romance");
            }
            if (Family_Movies == true) categories.Add("Family");
            if (Fantasy == true) categories.Add("Fantasy");
            if (Horror_Movies == true) categories.Add("Horror");
            if (International_Movies_Thrillers == true)
            {
                categories.Add("International");
                categories.Add("Thrillers");
            }

            if (International_TV_Shows_Romantic_TV_Shows_TV_Dramas == true)
            {
                categories.Add("Romance");
                categories.Add("Dramas");
                categories.Add("International");
            }
            
            if (Kids_TV == true) categories.Add("Kids");
            if (Language_TV_Shows == true) categories.Add("Language");
            if (Musicals == true) categories.Add("Musicals");
            if (Nature_TV == true) categories.Add("Nature");
            if (Reality_TV == true) categories.Add("Reality");
            if (Spirituality == true) categories.Add("Spirituality");
            if (TV_Action == true) categories.Add("Action");
            if (TV_Comedies == true) categories.Add("Comedies");
            if (TV_Dramas == true) categories.Add("Dramas");
            if (Talk_Shows_TV_Comedies == true) categories.Add("Talk Shows");
            if (Thrillers == true) categories.Add("Thrillers");
            
            return categories.Distinct().ToList();
        }
    }
    
}