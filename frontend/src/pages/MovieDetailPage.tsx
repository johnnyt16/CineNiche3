import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, ReviewedMovie, MovieItem } from '../context/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';
import { moviesApi, MovieTitle } from '../services/api';
import { usersApi } from '../services/api';

// Star Rating component
const StarRating: React.FC<{ 
  rating: number, 
  editable?: boolean, 
  onRatingChange?: (rating: number) => void 
}> = ({ rating, editable = false, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  // Handle half-star logic
  const hasHalfStar = rating % 1 !== 0;
  const fullStars = Math.floor(rating);
  
  const handleMouseEnter = (star: number) => {
    if (editable) {
      setHoverRating(star);
    }
  };
  
  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(0);
    }
  };
  
  const handleClick = (star: number) => {
    if (editable && onRatingChange) {
      // If user clicks the same star they already selected, toggle between full and half star
      if (Math.floor(rating) === star) {
        // If it's already a full star, make it a half star
        if (rating === star) {
          onRatingChange(star - 0.5);
        } else {
          // If it's a half star, make it a full star
          onRatingChange(star);
        }
      } else {
        // Otherwise, select the full star
        onRatingChange(star);
      }
    }
  };
  
  return (
    <div className="star-rating" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hoverRating ? star <= hoverRating : star <= fullStars;
        const isHalfStar = !hoverRating && hasHalfStar && star === fullStars + 1;
        
        return (
          <span 
            key={star} 
            className={`star ${isActive ? 'filled' : ''} ${isHalfStar ? 'half-filled' : ''} ${editable ? 'editable' : ''}`}
            onMouseEnter={() => handleMouseEnter(star)}
            onClick={() => handleClick(star)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

// Movie type definition with additional fields
interface Movie {
  id: string;
  title: string;
  imageUrl: string;
  genre: string;
  year: number;
  director: string;
  cast: string[];
  country: string;
  description: string;
  contentRating: string;
  runtime: number;
  averageRating: number;
  ratingCount: number;
}

// Convert MovieTitle from API to our frontend Movie type
const convertToMovie = async (movieTitle: MovieTitle): Promise<Movie> => {
  // Debug each property before conversion
  console.log("Converting to Movie:", {
    show_id: movieTitle.show_id,
    title: movieTitle.title,
    categories: movieTitle.Categories || [],
    runtime: movieTitle.RuntimeMinutes,
    cast: movieTitle.cast
  });

  // Clean up the title if it exists, otherwise show as "Unknown"
  const cleanTitle = movieTitle.title ? movieTitle.title.replace(/#/g, '').trim() : 'Unknown Title';
  
  // Check for both lowercase and uppercase key versions (due to camelCase serialization)
  const categories = movieTitle.Categories || movieTitle.categories || [];
  
  // Get genre from Categories array if available - check both camelCase and PascalCase
  const genre = categories.length > 0 
    ? categories.join(', ')
    : 'Unknown';
    
  // Default to placeholder - we'll load the actual poster later if needed
  let posterUrl = `/images/placeholder-movie.jpg`;
  
  // Check both camelCase and PascalCase variations of runtime
  const runtime = movieTitle.RuntimeMinutes || movieTitle.runtimeMinutes || 0;
  
  // New logic for processing cast: group every two words as a name
  let castArray: string[] = ['Unknown Cast'];
  
  if (movieTitle.cast) {
    // First check if cast already has commas (proper formatting)
    if (movieTitle.cast.includes(',')) {
      castArray = movieTitle.cast.split(',').map(actor => actor.trim());
    } else {
      // If no commas, process by assuming every two words is a name
      const words = movieTitle.cast.trim().split(/\s+/);
      castArray = [];
      
      // Group every two words together
      for (let i = 0; i < words.length; i += 2) {
        if (i + 1 < words.length) {
          // If we have two words, join them
          castArray.push(`${words[i]} ${words[i + 1]}`);
        } else {
          // If we have an odd number of words, the last one gets its own entry
          castArray.push(words[i]);
        }
      }
      
      // If we didn't get any valid names, use default
      if (castArray.length === 0) {
        castArray = ['Unknown Cast'];
      }
    }
  }
  
  console.log("Processed cast array:", castArray);
  
  return {
    id: movieTitle.show_id,
    title: cleanTitle,
    imageUrl: posterUrl,
    genre: genre,
    year: movieTitle.release_year || 0,
    director: movieTitle.director || 'Unknown',
    cast: castArray,
    country: movieTitle.country || 'Unknown',
    description: movieTitle.description || 'No description available.',
    contentRating: movieTitle.rating || 'NR',
    runtime: runtime,
    averageRating: 0, // Will be calculated from ratings if available
    ratingCount: 0 // Will be calculated from ratings if available
  };
};

// Sample movie data as fallback
const SAMPLE_MOVIES: Movie[] = [
  { 
    id: '1', 
    title: 'The Matrix', 
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg', 
    genre: 'Sci-Fi',
    year: 1999,
    director: 'Lana Wachowski, Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
    country: 'United States',
    description: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    contentRating: 'R',
    runtime: 136,
    averageRating: 4.7,
    ratingCount: 2836
  },
  { 
    id: '2', 
    title: 'Eraserhead', 
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BNWM1NmYyM2ItMTFhNy00NDU0LTk2ODItYWEyMzQ5MThmNzVhXkEyXkFqcGdeQXVyNTU1OTUzNDg@._V1_.jpg', 
    genre: 'Experimental', 
    year: 1977,
    director: 'David Lynch',
    cast: ['Jack Nance', 'Charlotte Stewart', 'Allen Joseph', 'Jeanne Bates'],
    country: 'United States',
    description: 'Henry Spencer tries to survive his industrial environment, his angry girlfriend, and the unbearable screams of his newly born mutant child.',
    contentRating: 'Not Rated',
    runtime: 89,
    averageRating: 3.9,
    ratingCount: 1425
  },
  { 
    id: '3', 
    title: 'The Lord of the Rings', 
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BNzA5ZDNlZWMtM2NhNS00NDJjLTk4NDItYTRmY2EwMWZlMTY3XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg', 
    genre: 'Fantasy', 
    year: 2003,
    director: 'Peter Jackson',
    cast: ['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen', 'Orlando Bloom'],
    country: 'New Zealand, United States',
    description: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.',
    contentRating: 'PG-13',
    runtime: 201,
    averageRating: 4.9,
    ratingCount: 3854
  },
  { 
    id: '4', 
    title: 'The Dark Knight', 
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg', 
    genre: 'Action',
    year: 2008,
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'],
    country: 'United States, United Kingdom',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    contentRating: 'PG-13',
    runtime: 152,
    averageRating: 4.8,
    ratingCount: 4210
  },
  { 
    id: '5', 
    title: 'Titanic', 
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BMDdmZGU3NDQtY2E5My00ZTliLWIzOTUtMTY4ZGI1YjdiNjk3XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_.jpg', 
    genre: 'Romance',
    year: 1997,
    director: 'James Cameron',
    cast: ['Leonardo DiCaprio', 'Kate Winslet', 'Billy Zane', 'Kathy Bates'],
    country: 'United States',
    description: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.',
    contentRating: 'PG-13',
    runtime: 194,
    averageRating: 4.3,
    ratingCount: 3568
  },
  {
    id: '6',
    title: 'Forrest Gump',
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg',
    genre: 'Drama',
    year: 1994,
    director: 'Robert Zemeckis',
    cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise', 'Sally Field'],
    country: 'United States',
    description: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75, whose only desire is to be reunited with his childhood sweetheart.',
    contentRating: 'PG-13',
    runtime: 142,
    averageRating: 4.5,
    ratingCount: 2945
  },
  {
    id: '7',
    title: 'Interstellar',
    imageUrl: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg',
    genre: 'Sci-Fi',
    year: 2014,
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    country: 'United States, United Kingdom, Canada',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    contentRating: 'PG-13',
    runtime: 169,
    averageRating: 4.6,
    ratingCount: 3187
  }
];

// Movie data store (would be replaced by API in real app)
export let moviesData = [...SAMPLE_MOVIES];

// Admin Movie Edit Form component
const MovieEditForm: React.FC<{
  movie: Movie;
  onSave: (updatedMovie: Movie) => void;
  onCancel: () => void;
}> = ({ movie, onSave, onCancel }) => {
  const [title, setTitle] = useState(movie.title);
  const [imageUrl, setImageUrl] = useState(movie.imageUrl);
  const [genre, setGenre] = useState(movie.genre);
  const [year, setYear] = useState(movie.year);
  const [director, setDirector] = useState(movie.director);
  const [cast, setCast] = useState<string[]>(movie.cast);
  const [castInput, setCastInput] = useState(movie.cast.join(', '));
  const [country, setCountry] = useState(movie.country);
  const [description, setDescription] = useState(movie.description);
  const [contentRating, setContentRating] = useState(movie.contentRating);
  const [runtime, setRuntime] = useState(movie.runtime);
  
  const handleCastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCastInput(e.target.value);
    setCast(e.target.value.split(',').map(item => item.trim()).filter(item => item));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...movie,
      title,
      imageUrl,
      genre,
      year,
      director,
      cast,
      country,
      description,
      contentRating,
      runtime
    });
  };
  
  return (
    <div className="admin-edit-form">
      <h2>Edit Movie</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-columns">
          <div className="form-column">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="imageUrl">Image URL</label>
              <input
                id="imageUrl"
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="genre">Genre</label>
                <input
                  id="genre"
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="director">Director</label>
              <input
                id="director"
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="cast">Cast (comma separated)</label>
              <input
                id="cast"
                type="text"
                value={castInput}
                onChange={handleCastChange}
                required
              />
            </div>
          </div>
          
          <div className="form-column">
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contentRating">Content Rating</label>
                <input
                  id="contentRating"
                  type="text"
                  value={contentRating}
                  onChange={(e) => setContentRating(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="runtime">Runtime (minutes)</label>
                <input
                  id="runtime"
                  type="number"
                  value={runtime}
                  onChange={(e) => setRuntime(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Changes</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [isInFavorites, setIsInFavorites] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const similarMoviesRef = useRef<HTMLDivElement>(null);
  const reviewFormRef = useRef<HTMLDivElement>(null);
  
  // Get auth context
  const { 
    isAuthenticated, 
    user,
    reviewedMovies, 
    addReview, 
    loadUserReviews,
    toggleFavorite, 
    toggleWatchlist, 
    isInFavorites: checkFavorites, 
    isInWatchlist: checkWatchlist,
    isAdmin
  } = useAuth();
  
  // Find user's review for this movie
  const userReview = reviewedMovies.find(review => review.id === id);

  // Fetch movie data from API
  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const movieData = await moviesApi.getMovieById(id);
        
        // Debug the raw data coming from the API
        console.log('RAW API Response:', JSON.stringify(movieData, null, 2));
        console.log('API returned Categories:', movieData?.Categories);
        console.log('API returned RuntimeMinutes:', movieData?.RuntimeMinutes);
        console.log('API returned duration:', movieData?.duration);
        
        if (movieData) {
          // Convert the API data to our frontend Movie format
          const movieDetails = await convertToMovie(movieData);
          
          // Set initial movie details without poster to show UI faster
          setMovie(movieDetails);
          
          // Only then try to load the poster
          if (movieData.title) {
            try {
              // Use a small delay to avoid resource limits
              await new Promise(resolve => setTimeout(resolve, 100));
              const posterUrl = await moviesApi.getMoviePosterUrl(movieData.title);
              
              // Update the movie with the poster
              setMovie(prev => {
                if (prev === null) return null;
                return {
                  ...prev,
                  imageUrl: posterUrl
                };
              });
            } catch (err) {
              console.error(`Error fetching poster for ${movieData.title}:`, err);
              // Keep using the placeholder image
            }
          }
          
          // Log the converted movie object with genre and runtime
          console.log('Converted to frontend format:', movieDetails);
          console.log('Genre after conversion:', movieDetails.genre);
          console.log('Runtime after conversion:', movieDetails.runtime);
          
          // Fetch the average rating for this movie
          try {
            const avgRating = await moviesApi.getMovieAverageRating(id);
            movieDetails.averageRating = avgRating;
            
            // Get the number of ratings
            const ratings = await moviesApi.getMovieRatings(id);
            movieDetails.ratingCount = ratings.length;
            
            // Update movie with ratings data
            setMovie(prev => {
              if (prev === null) return null;
              return {
                ...prev,
                averageRating: avgRating,
                ratingCount: ratings.length
              };
            });
          } catch (err) {
            console.error('Error fetching ratings:', err);
            // Use default values if ratings can't be fetched
          }
          
          // Check if the movie is in favorites or watchlist
          if (isAuthenticated) {
            setIsInFavorites(checkFavorites(id));
            setIsInWatchlist(checkWatchlist(id));
          }
          
          // Set review text and rating if the user has already reviewed this movie
          if (userReview) {
            setReviewText(userReview.review);
            setReviewRating(userReview.rating);
          }
        } else {
          // Use sample data as fallback
          const sampleMovie = SAMPLE_MOVIES.find(m => m.id === id);
          if (sampleMovie) {
            setMovie(sampleMovie);
            // Check if the movie is in favorites or watchlist
            if (isAuthenticated) {
              setIsInFavorites(checkFavorites(id));
              setIsInWatchlist(checkWatchlist(id));
            }
            
            // Set review text and rating if the user has already reviewed this movie
            if (userReview) {
              setReviewText(userReview.review);
              setReviewRating(userReview.rating);
            }
            
            setError('Could not fetch movie details from API. Using sample data.');
          } else {
            setError('Movie not found');
          }
        }
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError('Error loading movie details');
        
        // Try to use sample data as fallback
        const sampleMovie = SAMPLE_MOVIES.find(m => m.id === id);
        if (sampleMovie) {
          setMovie(sampleMovie);
          setError('Could not fetch movie details from API. Using sample data.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovie();
  }, [id, isAuthenticated, checkFavorites, checkWatchlist, userReview]);

  // Add this new useEffect specifically for recommendations
useEffect(() => {
  // Only fetch recommendations if we have a movie loaded
  if (!movie) return;

  const fetchRecommendations = async () => {
      try {
          const recommendations = await moviesApi.getMovieRecommendations(
              movie.id, 
              user?.id
          );
          
          const recommendedMovies = await Promise.all(
              recommendations.map(async (rec: MovieTitle) => {
                  const converted = await convertToMovie(rec);
                  // Optional: Enhance with poster images
                  if (rec.title) {
                      try {
                          converted.imageUrl = await moviesApi.getMoviePosterUrl(rec.title);
                      } catch (err) {
                          console.error('Error loading poster:', err);
                      }
                  }
                  return converted;
              })
          );
          
          setSimilarMovies(recommendedMovies);
      } catch (error) {
          console.error('Recommendation fetch failed:', error);
          setSimilarMovies([]); // Fallback to empty array
      }
  };

  fetchRecommendations();
}, [movie, user?.id]); // Re-run when movie or user changes
  
  // This effect ensures the component updates when reviewedMovies changes
  useEffect(() => {
    // The userReview variable will be updated when reviewedMovies changes
    // and this forces a re-render of the rating display
    if (userReview) {
      console.log("User review updated:", userReview.rating);
    }
  }, [reviewedMovies, id]);
  
  // This effect handles scrolling to the review form when it becomes visible
  useEffect(() => {
    if (isReviewMode && reviewFormRef.current) {
      // Scroll the review form into view with smooth behavior
      reviewFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isReviewMode]);
  
  // Handle review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (movie && reviewRating > 0 && user) {
      try {
        // First save the rating to the database
        const ratingResult = await usersApi.addOrUpdateRating(user.id, movie.id, reviewRating, reviewText);
        
        if (ratingResult) {
          // Then create the review object for the UI
          const reviewData: ReviewedMovie = {
            id: movie.id,
            title: movie.title,
            imageUrl: movie.imageUrl,
            genre: movie.genre,
            year: movie.year,
            rating: reviewRating,
            review: reviewText
          };
          
          // Update local state via the AuthContext
          addReview(reviewData);
          
          // Load the updated reviews from the database via the AuthContext
          if (user) {
            await loadUserReviews(user.id);
          }
          
          setIsReviewMode(false);
          
          // Scroll back to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          alert('Failed to save your review. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('An error occurred while saving your review. Please try again.');
      }
    }
  };

  // Handle add to favorites
  const handleAddToFavorites = () => {
    if (!movie) return;
    
    const movieItem: MovieItem = {
      id: movie.id,
      title: movie.title,
      imageUrl: movie.imageUrl,
      genre: movie.genre,
      year: movie.year
    };
    
    toggleFavorite(movieItem);
    setIsInFavorites(!isInFavorites);
  };

  // Handle add to watchlist
  const handleAddToWatchlist = () => {
    if (!movie) return;
    
    const movieItem: MovieItem = {
      id: movie.id,
      title: movie.title,
      imageUrl: movie.imageUrl,
      genre: movie.genre,
      year: movie.year
    };
    
    toggleWatchlist(movieItem);
    setIsInWatchlist(!isInWatchlist);
  };

  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  
  const handleSaveEdit = async (updatedMovie: Movie) => {
    if (!movie) return;
    
    setLoading(true);
    
    try {
      // Format release year as number
      const releaseYear = typeof updatedMovie.year === 'number' 
        ? updatedMovie.year 
        : parseInt(String(updatedMovie.year));
        
      // Format duration for API
      const duration = `${updatedMovie.runtime} min`;
      
      // Format cast for API (from array to comma-separated string)
      const cast = Array.isArray(updatedMovie.cast) 
        ? updatedMovie.cast.join(', ') 
        : updatedMovie.cast;
        
      // Default type to "Movie" since we don't have contentType in the Movie interface
      const type = "Movie";
      
      // Create genres array from the genre string
      const genres = updatedMovie.genre.split(',').map(g => g.trim());
      
      // Make API call to update the movie
      const success = await moviesApi.updateMovie(updatedMovie.id, {
        title: updatedMovie.title,
        type,
        director: updatedMovie.director,
        cast,
        country: updatedMovie.country,
        release_year: releaseYear,
        rating: updatedMovie.contentRating,
        duration,
        description: updatedMovie.description,
        genres
      });
      
      if (success) {
        // Update current movie state on success
        setMovie(updatedMovie);
        setIsEditMode(false);
        
        // Show a success message
        // You can add a toast or notification here
      } else {
        // Handle error
        setError("Failed to update the movie. Please try again.");
      }
    } catch (err) {
      console.error("Error updating movie:", err);
      setError("An error occurred while updating the movie.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteMovie = async () => {
    if (!movie) return;
    
    setLoading(true);
    
    try {
      // Make API call to delete the movie
      const success = await moviesApi.deleteMovie(movie.id);
      
      if (success) {
        // Redirect to movies page on success
        navigate('/movies');
      } else {
        // Handle error
        setError("Failed to delete the movie. Please try again.");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Error deleting movie:", err);
      setError("An error occurred while deleting the movie.");
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading movie details...</div>
      </div>
    );
  }
  
  if (!movie) {
    return (
      <div className="error-container">
        <h2>Movie Not Found</h2>
        <p>Sorry, we couldn't find the movie you're looking for.</p>
        <Link to="/movies" className="btn-primary">Back to Movies</Link>
      </div>
    );
  }
  
  if (isEditMode && isAdmin) {
    return (
      <div className="movie-detail-page">
        <div className="container">
          <div className="movie-header">
            <Link to="/movies" className="back-button">Back to Movies</Link>
          </div>
          
          <MovieEditForm 
            movie={movie} 
            onSave={handleSaveEdit} 
            onCancel={() => setIsEditMode(false)} 
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="movie-detail-page">
      <div className="container">
        <div className="movie-header">
          <Link to="/movies" className="back-button">Back to Movies</Link>
          
          {isAdmin && (
            <div className="admin-controls">
              <button 
                className="btn-secondary admin-btn" 
                onClick={() => setIsEditMode(true)}
              >
                <Pencil size={16} /> Edit Movie
              </button>
              <button 
                className="btn-secondary admin-btn delete-btn" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} /> Delete Movie
              </button>
            </div>
          )}
        </div>
        
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <h3>Delete Movie</h3>
              <p>Are you sure you want to delete "{movie.title}"?</p>
              <p className="warning-text">This action cannot be undone.</p>
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary delete-confirm-btn"
                  onClick={handleDeleteMovie}
                >
                  Delete Movie
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="movie-content">
          <div className="movie-left-column">
            <div className="movie-poster">
              <img src={movie.imageUrl} alt={movie.title} />
              
              <div className="movie-rating-badge">
                <span>{movie.contentRating}</span>
              </div>
            </div>
            
            {/* Show average rating in the left column for all users except logged-in users who are editing their review */}
            {(!isAuthenticated || !isReviewMode) && (
              <div className="average-rating-container">
                <span className="meta-label">Average CineNiche Rating</span>
                <div className="average-rating">
                  <div className="stars">
                    <StarRating rating={movie.averageRating} />
                  </div>
                  <span className="rating-number">{movie.averageRating.toFixed(1)}</span>
                  <span className="rating-count">({movie.ratingCount} ratings)</span>
                </div>
              </div>
            )}
            
            {isAuthenticated && userReview && !isReviewMode && (
              <div className="movie-actions left-column-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setIsReviewMode(true)}
                >
                  Edit Your Review
                </button>
              </div>
            )}
          </div>
          
          <div className="movie-info">
            <div className="movie-metadata">
              <div className="movie-title-container">
                <h1>{movie.title} <span className="movie-year">({movie.year})</span></h1>
                {!isAuthenticated && (
                  <button 
                    className="btn-primary btn-sign-in"
                    onClick={() => navigate('/login')}
                  >
                    Sign in to review
                  </button>
                )}
                {isAuthenticated && !userReview && (
                  <button 
                    className="btn-primary btn-sign-in"
                    onClick={() => setIsReviewMode(true)}
                  >
                    Write a Review
                  </button>
                )}
                {isAuthenticated && userReview && (
                  <div className="user-rating-display">
                    <span>Your Rating:</span>
                    <StarRating rating={userReview.rating} />
                  </div>
                )}
              </div>
              
              {isAuthenticated && (
                <div className="collection-actions-container">
                  <button 
                    className={`btn-secondary btn-favorite ${isInFavorites ? 'active' : ''}`}
                    onClick={handleAddToFavorites}
                  >
                    <span className="action-icon">★</span> {isInFavorites ? 'Added to Favorites' : 'Add to Favorites'}
                  </button>
                  <button 
                    className={`btn-secondary btn-watchlist ${isInWatchlist ? 'active' : ''}`}
                    onClick={handleAddToWatchlist}
                  >
                    <span className="action-icon">+</span> {isInWatchlist ? 'Added to Watchlist' : 'Add to Watchlist'}
                  </button>
                </div>
              )}
              
              <div className="watch-movie-container">
                <button 
                  className="btn-primary btn-watch"
                  onClick={() => navigate(`/watch/${movie.id}`)}
                >
                  <span className="action-icon">▶</span> Watch
                </button>
              </div>
              
              <div className="movie-meta-details">
                <div className="movie-meta-item">
                  <span className="meta-label">Runtime</span>
                  <span>
                    {movie.runtime ? 
                      `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 
                      'Unknown'}
                  </span>
                </div>
                
                <div className="movie-meta-item">
                  <span className="meta-label">Genre</span>
                  <span className="movie-genre-tag">{movie.genre || 'Unknown'}</span>
                </div>
              </div>
              
              <div className="movie-tech-specs">
                <p><span>Director:</span> {movie.director || 'Unknown'}</p>
                <p><span>Country:</span> {movie.country || 'Unknown'}</p>
                <p><span>Release:</span> {movie.year || 'Unknown'}</p>
                <p><span>Rating:</span> {movie.contentRating || 'NR'}</p>
              </div>
            </div>
            
            <div className="movie-cast">
              <h3>Cast</h3>
              <div className="cast-list">
                {movie.cast && movie.cast.length > 0 
                  ? movie.cast.slice(0, 4).map((actor, index) => (
                      <div key={index} className="cast-item">
                        <div className="cast-avatar">{actor.charAt(0)}</div>
                        <span>{actor}</span>
                      </div>
                    ))
                  : <div className="cast-item">
                      <div className="cast-avatar">?</div>
                      <span>Unknown Cast</span>
                    </div>
                }
              </div>
            </div>
            
            <div className="movie-description">
              <h3>Synopsis</h3>
              <p>{movie.description || 'No description available.'}</p>
            </div>
            
            {isReviewMode && (
              <div className="review-form-container" ref={reviewFormRef}>
                <h3>{userReview ? 'Edit Your Review' : 'Write a Review'}</h3>
                
                <form onSubmit={handleReviewSubmit} className="review-form">
                  <div className="form-group">
                    <label>Your Rating</label>
                    <StarRating 
                      rating={reviewRating} 
                      editable={true} 
                      onRatingChange={setReviewRating} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="reviewText">Your Review</label>
                    <textarea
                      id="reviewText"
                      rows={5}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      required
                      placeholder="Write your thoughts about this movie..."
                    />
                  </div>
                  
                  <div className="review-form-actions">
                    <button type="submit" className="btn-primary" disabled={reviewRating === 0}>
                      {userReview ? 'Update Review' : 'Submit Review'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => setIsReviewMode(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {userReview && !isReviewMode && (
              <div className="user-review-container">
                <h3>Your Review</h3>
                <StarRating rating={userReview.rating} />
                <p className="user-review-text">{userReview.review}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="similar-movies-section">
          <h3>
            {isAuthenticated 
              ? "Similar Movies you might like" 
              : "Similar Movies"}
          </h3>
          <div 
            className="film-scroll-container" 
            ref={similarMoviesRef}
          >
            <div className="film-scroll-track">
              {similarMovies.slice(0, 10).map((movie) => (
                <Link to={`/movies/${movie.id}`} key={movie.id} className="film-item">
                  <img src={movie.imageUrl} alt={movie.title} />
                  <p>{movie.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailPage; 