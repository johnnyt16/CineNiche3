import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusCircle } from 'lucide-react';
// Individual imports for react-icons to avoid type errors
import { FaHeart } from 'react-icons/fa';
import { FaRegHeart } from 'react-icons/fa';
import { FaBookmark } from 'react-icons/fa';
import { FaRegBookmark } from 'react-icons/fa';
import { FaCheck } from 'react-icons/fa';
import { FaSearch } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa';
import { moviesApi, MovieTitle } from '../services/api';

export type Movie = {
  id: string;
  title: string;
  year: number;
  genres: string[];
  contentType: string; // 'Movie' or 'TV Show'
  poster: string;
  description: string;
  contentRating: string;
  director: string;
  imdbRating: number;
  averageRating?: number;
  ratingCount?: number;
};

// Define updated interface for MovieItem to match Movie id type
export interface MovieItem {
  id: string;
  title: string;
  imageUrl: string;
  genre: string;
  year: number;
}

// Convert backend MovieTitle to frontend Movie format
const convertToMovie = async (movieTitle: MovieTitle): Promise<Movie> => {
  // Clean up the title if it exists, otherwise show as "Unknown"
  const cleanTitle = movieTitle.title ? movieTitle.title.replace(/#/g, '').trim() : 'Unknown Title';
  
  // Get genres from Categories array if available - handle both camelCase and PascalCase
  const categories = movieTitle.Categories || movieTitle.categories || [];
  const genres = categories.length > 0 ? categories : ['Unknown'];
  
  // Placeholder for poster - will be populated later in batches
  let posterUrl = `/images/placeholder-movie.jpg`;
  
  // Use actual data where available, fallback to Unknown
  return {
    id: movieTitle.show_id,
    title: cleanTitle,
    year: movieTitle.release_year || 0,
    genres: genres,
    contentType: movieTitle.type || "Movie",
    poster: posterUrl,
    description: movieTitle.description || 'No description available.',
    contentRating: movieTitle.rating || 'NR',
    director: movieTitle.director || 'Unknown',
    imdbRating: 0, // No actual source for this
    averageRating: 0, // Will be populated from ratings if available
    ratingCount: 0 // Will be populated from ratings if available
  };
};

// Helper function to update posters in batches
const updatePostersInBatches = async (movies: Movie[], batchSize = 5, delay = 100): Promise<Movie[]> => {
  const updatedMovies = [...movies];
  
  // Process in small batches to avoid overwhelming the API
  for (let i = 0; i < updatedMovies.length; i += batchSize) {
    const batch = updatedMovies.slice(i, i + batchSize);
    
    // Process this batch
    await Promise.all(
      batch.map(async (movie, index) => {
        try {
          // Only fetch poster if we have a title
          if (movie.title && movie.title !== 'Unknown Title') {
            const posterUrl = await moviesApi.getMoviePosterUrl(movie.title);
            updatedMovies[i + index].poster = posterUrl;
          }
        } catch (error) {
          console.error(`Error fetching poster for ${movie.title}:`, error);
        }
      })
    );
    
    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < updatedMovies.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return updatedMovies;
};

// Sample movie data as fallback
const sampleMovies: Movie[] = [
  {
    id: "1",
    title: "Inception",
    year: 2010,
    genres: ["Action", "Sci-Fi", "Thriller"],
    contentType: "Movie",
    poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    contentRating: "PG-13",
    director: "Christopher Nolan",
    imdbRating: 8.8,
    averageRating: 4.5,
    ratingCount: 42
  },
  {
    id: "2",
    title: "The Dark Knight",
    year: 2008,
    genres: ["Action", "Crime", "Drama"],
    contentType: "Movie",
    poster: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    contentRating: "PG-13",
    director: "Christopher Nolan",
    imdbRating: 9.0,
    averageRating: 4.8,
    ratingCount: 78
  },
  {
    id: "3",
    title: "Stranger Things",
    year: 2016,
    genres: ["Drama", "Fantasy", "Horror"],
    contentType: "TV Show",
    poster: "https://m.media-amazon.com/images/M/MV5BN2ZmYjg1YmItNWQ4OC00YWM0LWE0ZDktYThjOTZiZjhhN2Q2XkEyXkFqcGdeQXVyNjgxNTQ3Mjk@._V1_SX300.jpg",
    description: "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.",
    contentRating: "TV-14",
    director: "The Duffer Brothers",
    imdbRating: 8.7,
    averageRating: 4.6,
    ratingCount: 56
  },
  {
    id: "4",
    title: "Interstellar",
    year: 2014,
    genres: ["Adventure", "Drama", "Sci-Fi"],
    contentType: "Movie",
    poster: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    contentRating: "PG-13",
    director: "Christopher Nolan",
    imdbRating: 8.6,
    averageRating: 4.3,
    ratingCount: 38
  },
  {
    id: "5",
    title: "Breaking Bad",
    year: 2008,
    genres: ["Crime", "Drama", "Thriller"],
    contentType: "TV Show",
    poster: "https://m.media-amazon.com/images/M/MV5BMjhiMzgxZTctNDc1Ni00OTIxLTlhMTYtZTA3ZWFkODRkNmE2XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg",
    description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    contentRating: "TV-MA",
    director: "Vince Gilligan",
    imdbRating: 9.5,
    averageRating: 4.9,
    ratingCount: 92
  },
  {
    id: "6",
    title: "The Shawshank Redemption",
    year: 1994,
    genres: ["Drama"],
    contentType: "Movie",
    poster: "https://m.media-amazon.com/images/M/MV5BMDFkYTc0MGEtZmNhMC00ZDIzLWFmNTEtODM1ZmRlYWMwMWFmXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    contentRating: "R",
    director: "Frank Darabont",
    imdbRating: 9.3,
    averageRating: 4.7,
    ratingCount: 63
  }
];

const MoviesPage: React.FC = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [selectedContentType, setSelectedContentType] = useState<string>('All Types');
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [isContentTypeDropdownOpen, setIsContentTypeDropdownOpen] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string>('All');
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // Used for first page load
  const [loadingMore, setLoadingMore] = useState(false); // Used for subsequent page loads
  const [searching, setSearching] = useState(false); // Add tracking for search state
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const pageSize = 20; // Number of movies per page
  
  const { isAuthenticated, favorites, watchlist, isAdmin } = useAuth();
  
  // Computed properties for button states
  const isInFavorites = collectionFilter === 'Favorites';
  const isInWatchlist = collectionFilter === 'Watchlist';
  
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const contentTypeDropdownRef = useRef<HTMLDivElement>(null);
  const collectionDropdownRef = useRef<HTMLDivElement>(null);

  // Add a ref to track if filtering is in progress
  const isFilteringRef = useRef(false);

  // Add a state to track if we're loading initial filter results
  const [loadingFilterResults, setLoadingFilterResults] = useState(false);

  // Add debouncing for search term to prevent too many API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch movies when search term or filters change (debounced)
  useEffect(() => {
    // Skip the initial render
    if (initialLoading) return;
    
    // Fetch movies whenever debouncedSearchTerm, genre, or content type changes
    // We'll use a unified function for this
    fetchMoviesWithCurrentSettings(1); // Always fetch page 1 when search/filter changes
    
  }, [debouncedSearchTerm, selectedGenre, selectedContentType]);

  // Fetch initial page of movies from API (only on component mount)
  useEffect(() => {
    // Use the unified fetch function, passing current filters
    fetchMoviesWithCurrentSettings(1); 
  }, []); // Empty dependency array ensures this runs only once on mount

  // Unified function to fetch movies based on current search, filters, and page
  const fetchMoviesWithCurrentSettings = async (pageToFetch: number) => {
    try {
      // Set loading state based on whether it's the first page
      if (pageToFetch === 1) {
        setInitialLoading(true); // Show main loading spinner for first page/filter change
        setMovies([]); // Clear existing movies when filter/search changes
        setFilteredMovies([]);
      } else {
        setLoadingMore(true); // Show load more spinner for subsequent pages
      }
      
      setError(''); // Clear previous errors
      
      // Use the appropriate API call
      const apiCall = debouncedSearchTerm 
        ? moviesApi.searchMovies(debouncedSearchTerm, pageToFetch, pageSize, selectedGenre, selectedContentType)
        : moviesApi.getMoviesPaged(pageToFetch, pageSize, selectedGenre, selectedContentType);
        
      const response = await apiCall;
      
      if (response.movies.length > 0) {
        // Convert ONLY the new movies from the response
        const newMoviesWithoutPosters = await Promise.all(response.movies.map(convertToMovie));
        
        // Update pagination info
        setCurrentPage(response.pagination.currentPage);
        setTotalPages(response.pagination.totalPages);
        setHasMorePages(response.pagination.hasNext);
        
        // Fetch posters ONLY for the new movies
        const newMoviesWithPosters = await updatePostersInBatches(newMoviesWithoutPosters);

        // Determine the final list
        // If page 1, replace the entire list with the new filtered movies
        // If page > 1, append the new filtered movies to the existing list and deduplicate
        const finalMoviesList = pageToFetch === 1 
          ? newMoviesWithPosters 
          : removeDuplicateMovies([...movies, ...newMoviesWithPosters]);

        // Update the main movies state ONCE with the final list
        setMovies(finalMoviesList);
        // The useEffect hook listening to 'movies' and 'collectionFilter' will handle applying collection filters later if needed
        
      } else {
        // No movies returned from API for this page/filter
        if (pageToFetch === 1) {
          // If it was the first page, clear the list and show error
          setError(debouncedSearchTerm 
            ? `No results found for "${debouncedSearchTerm}" with the selected filters.`
            : 'No movies found matching the selected filters.');
          setMovies([]); // Clear movies state
          setFilteredMovies([]); // Clear filtered movies state directly too
        }
        setHasMorePages(false); // No more pages available
      }
    } catch (err) {
      console.error('Error fetching movies:', err);
      const errorMessage = err instanceof Error 
        ? `API connection error: ${err.message}.`
        : 'Error loading movies.';
      setError(errorMessage);
      // Optionally clear movies on error? Or keep existing?
      // setMovies([]); 
      // setFilteredMovies([]);
    } finally {
      // Reset loading states
      if (pageToFetch === 1) {
        setInitialLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // Remove the old fetchInitialMovies function
  /*
  const fetchInitialMovies = async () => {
    // ... old code ...
  };
  */

  // Remove the old loadMoreMovies function
  /*
  const loadMoreMovies = async (recursionDepth: number = 0): Promise<void> => {
    // ... old code ...
  };
  */
  
  // Keep the simple handleLoadMore which now calls the unified fetch function
  const handleLoadMore = () => {
    if (hasMorePages && !loadingMore) {
      fetchMoviesWithCurrentSettings(currentPage + 1);
    }
  };

  // Updated applyFilters to ONLY handle collection filters (Favorites/Watchlist)
  // Genre and Content Type filtering is now done by the backend API.
  const applyCollectionFilters = (moviesList: Movie[]) => {
    // Prevent concurrent filtering
    if (isFilteringRef.current) {
      return;
    }
    isFilteringRef.current = true;
    
    try {
      // Ensure we are working with unique movies
      const uniqueMovies = removeDuplicateMovies(moviesList);
      let result = uniqueMovies;
      
      // Apply collection filters if user is authenticated
      if (isAuthenticated) {
        if (collectionFilter === 'Favorites') {
          result = result.filter(movie => favorites.some(fav => fav.id === movie.id));
        } else if (collectionFilter === 'Watchlist') {
          result = result.filter(movie => watchlist.some(item => item.id === movie.id));
        }
      }
      
      setFilteredMovies(result);
    } finally {
      isFilteringRef.current = false;
    }
  };
  
  // Keep removeDuplicateMovies as it is
  const removeDuplicateMovies = (moviesList: Movie[]): Movie[] => {
    const uniqueMovies = new Map<string, Movie>();
    moviesList.forEach(movie => {
      if (!uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    });
    return Array.from(uniqueMovies.values());
  };

  // Update uniqueGenres and contentTypes to be based on the FULL movies list
  // (This might not be ideal if the list gets huge, but simpler for now)
  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    // Consider fetching genres from a dedicated API endpoint in the future
    // For now, derive from loaded movies (might be incomplete)
    movies.forEach(movie => {
      movie.genres.forEach(genre => genres.add(genre));
    });
    // Add some common genres that might not be in the first page
    ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Horror', 'Romance'].forEach(g => genres.add(g));
    return ['All Genres', ...Array.from(genres).sort()];
  }, [movies]);

  const contentTypes = useMemo(() => {
    const types = new Set<string>();
    movies.forEach(movie => types.add(movie.contentType));
    // Add expected types
    ['Movie', 'TV Show'].forEach(t => types.add(t));
    return ['All Types', ...Array.from(types).sort()];
  }, [movies]);

  // Add useEffect to apply collection filters whenever movies or collectionFilter changes
  useEffect(() => {
    applyCollectionFilters(movies);
  }, [movies, collectionFilter, isAuthenticated, favorites, watchlist]); // Dependencies updated

  // Remove old filter-related functions no longer needed
  /*
  const loadMoreForFilter = async (): Promise<void> => { ... };
  const filterMoviesWithCriteria = (moviesToFilter: Movie[]): Movie[] => { ... };
  const loadBatchForFilter = async () => { ... };
  */
  
  // Handlers for dropdowns - no changes needed here, they just set state
  // Handle genre selection
  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
    setIsGenreDropdownOpen(false);
    // Fetching is handled by the main useEffect hook
  };

  // Handle content type selection
  const handleContentTypeSelect = (contentType: string) => {
    setSelectedContentType(contentType);
    setIsContentTypeDropdownOpen(false);
    // Fetching is handled by the main useEffect hook
  };

  // Handle collection filter selection
  const handleCollectionSelect = (filter: string) => {
    setCollectionFilter(filter);
    setIsCollectionDropdownOpen(false);
    // Collection filter useEffect will handle applying the filter
  };
  
  // Navigate to add movie page
  const handleAddMovie = () => {
    navigate('/movies/add');
  };

  // Handle search input changes, with option to clear
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
  };

  // Handle keyboard events for search - escape key clears search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
    }
  };

  // Update clearSearch to use the unified fetch function
  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    // fetchInitialMovies(); // <-- old way
    fetchMoviesWithCurrentSettings(1); // Fetch page 1 with current filters
  };

  return (
    <div className="page-container movies-page">
      <div className="header-with-actions">
        <h1>Browse Collection</h1>
        
        <div className="header-buttons">
          {isAuthenticated && (
            <div className="collection-buttons">
              <button 
                className={`collection-toggle-btn ${isInFavorites ? 'active' : ''}`}
                onClick={() => handleCollectionSelect(isInFavorites ? 'All' : 'Favorites')}
              >
                {isInFavorites ? <FaHeart /> : <FaRegHeart />} Favorites
              </button>
              <button 
                className={`collection-toggle-btn ${isInWatchlist ? 'active' : ''}`}
                onClick={() => handleCollectionSelect(isInWatchlist ? 'All' : 'Watchlist')}
              >
                {isInWatchlist ? <FaBookmark /> : <FaRegBookmark />} Watchlist
              </button>
            </div>
          )}
          
          {isAdmin && (
            <button className="btn-primary add-movie-btn" onClick={handleAddMovie}>
              <PlusCircle size={18} /> Add Movie
            </button>
          )}
        </div>
      </div>
      
      <div className="filters-container">
        <div className="filter-section-wrapper">
          <div className="filter-label">Search</div>
          <div className="search-box">
            <span className="search-icon-container">
              <FaSearch className="search-icon" />
            </span>
            <input
              type="text"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              disabled={initialLoading} // Disable while initial loading
            />
            {searching && (
              <span className="search-loading-indicator">
                <div className="spinner-small"></div>
              </span>
            )}
            {searchTerm && !searching && (
              <span className="search-clear-button" onClick={clearSearch}>
                ✕
              </span>
            )}
          </div>
        </div>
        
        <div className="filter-section-wrapper">
          <div className="filter-label">Filter</div>
          <div className="filter-section">
            {/* Genre Filter */}
            <div className="filter-dropdown" ref={genreDropdownRef}>
              <div 
                className={`custom-dropdown ${isGenreDropdownOpen ? 'active' : ''}`} 
                onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
              >
                <div className="selected-option">
                  {selectedGenre} <FaChevronDown className="dropdown-arrow" />
                </div>
                {isGenreDropdownOpen && (
                  <div className="dropdown-options">
                    {uniqueGenres.map((genre) => (
                      <div 
                        key={genre} 
                        className={`dropdown-option ${selectedGenre === genre ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGenre(genre);
                          setIsGenreDropdownOpen(false);
                        }}
                      >
                        {genre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Content Type Filter */}
            <div className="filter-dropdown" ref={contentTypeDropdownRef}>
              <div 
                className={`custom-dropdown ${isContentTypeDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsContentTypeDropdownOpen(!isContentTypeDropdownOpen)}
              >
                <div className="selected-option">
                  {selectedContentType} <FaChevronDown className="dropdown-arrow" />
                </div>
                {isContentTypeDropdownOpen && (
                  <div className="dropdown-options">
                    {contentTypes.map((type) => (
                      <div 
                        key={type} 
                        className={`dropdown-option ${selectedContentType === type ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContentType(type);
                          setIsContentTypeDropdownOpen(false);
                        }}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {initialLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading movies...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="movie-grid">
            {filteredMovies.map(movie => (
              <div key={movie.id} className="movie-card">
                <Link to={`/movies/${movie.id}`}>
                  <div className="movie-card-inner">
                    <img src={movie.poster} alt={movie.title} />
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <div className="movie-card-footer">
                        <span className="movie-year">{movie.year}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {hasMorePages && (
            <div className="load-more">
              <button 
                onClick={handleLoadMore} 
                className={`btn-primary ${loadingMore ? 'loading' : ''}`}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
          
          {filteredMovies.length === 0 && (
            <div className="no-results">
              <p>No movies found matching your criteria.</p>
              <button onClick={() => {
                setSearchTerm(''); 
                setSelectedGenre('All Genres');
                setSelectedContentType('All Types');
              }} className="btn-secondary">
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MoviesPage; 