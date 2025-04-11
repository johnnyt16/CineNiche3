import axios from 'axios';

// Determine the base URL based on environment
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Replace with Cloud Run URL once deployed
    return 'https://cineniche-backend-REPLACE_WITH_CLOUD_RUN_URL.a.run.app/api';
    // Uncomment the line below and remove the line above once you have the actual Cloud Run URL
    // return 'https://YOUR_CLOUD_RUN_DOMAIN/api';
  }
  return 'https://localhost:5213/api'; // Local development URL
};

// Create an axios instance with the base URL for our API
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Make sure we're using the correct format: "Bearer <token>"
      // Also ensure there's only one space after "Bearer"
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    
    // Add debugging for token issues
    if (config.url?.includes('2fa-status')) {
      console.log('Auth header for 2FA request:', config.headers.Authorization);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Movie interfaces matching the backend DTOs
export interface MovieTitle {
  show_id: string;
  type?: string;
  title?: string;
  director?: string;
  cast?: string;
  country?: string;
  release_year?: number;
  rating?: string;
  duration?: string;
  description?: string;
  Categories?: string[];
  RuntimeMinutes?: number;
  categories?: string[];
  runtimeMinutes?: number;
}

export interface MovieRating {
  user_id: number;
  show_id: string;
  rating: number;
  review?: string;
}

export interface MovieUser {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  city: string;
  state: string;
  password: string;
  isAdmin: number; // 0 for regular users, 1 for admins
}

export interface UserFavorite {
  favorite_id?: number; // Optional because it's auto-assigned by the database
  user_id: number;
  movie_id: string;
}

export interface UserWatchlist {
  watchlist_id?: number; // Optional because it's auto-assigned by the database
  user_id: number;
  movie_id: string;
}

// Poster URL cache to reduce API calls
let posterCache: Record<string, string> = {};
// Flag to track if we've loaded all posters already
let allPostersLoaded = false;
// Store all posters once fetched
let allPosterUrls: string[] = [];

// API response interfaces for pagination
export interface PaginatedResponse<T> {
  movies: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// API functions for movies
export const moviesApi = {
  // Get all movie titles (old method, kept for backward compatibility)
  getAllMovies: async (): Promise<MovieTitle[]> => {
    try {
      console.warn('getAllMovies() is deprecated, please use getMoviesPaged() instead');
      const response = await api.get('/movies/titles');
      return response.data;
    } catch (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
  },
  
  // Search movies by title - searches the entire database
  searchMovies: async (
    searchTerm: string, 
    page: number = 1, 
    pageSize: number = 20,
    genre?: string, 
    contentType?: string
  ): Promise<PaginatedResponse<MovieTitle>> => {
    try {
      console.log(`Searching for: "${searchTerm}" (page ${page}, pageSize ${pageSize}), filters:`, { genre, contentType });
      
      // If search term is empty, delegate to getMoviesPaged with filters
      if (!searchTerm || searchTerm.trim() === '') {
        console.log('Empty search term, delegating to getMoviesPaged with filters');
        // Make sure to await the result of the delegated call
        return await moviesApi.getMoviesPaged(page, pageSize, genre, contentType);
      }
      
      // Build params for search endpoint
      const params: Record<string, any> = { 
        query: searchTerm,
        page, 
        pageSize 
      };
      if (genre && genre !== 'All Genres') {
        params.genre = genre;
      }
      if (contentType && contentType !== 'All Types') {
        params.type = contentType; // Map frontend contentType to backend 'type'
        console.log(`Using content type filter: ${contentType} -> type=${params.type}`);
      }
      
      console.log('Sending search request with params:', params);
      
      // Make the API call with search and filter parameters
      const response = await api.get<PaginatedResponse<MovieTitle>>('/movies/search', { params });
      
      console.log(`Search returned ${response.data.movies.length} results`);
      return response.data;
      
    } catch (error) {
      console.error(`Error searching movies with term "${searchTerm}" and filters:`, { genre, contentType, error });
      // Return empty result on error
      return {
        movies: [],
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalPages: 0,
          totalCount: 0,
          hasNext: false,
          hasPrevious: page > 1
        }
      };
    }
  },
  
  // Create a new movie (for admin use)
  createMovie: async (movieData: {
    type: string;
    title: string;
    director?: string;
    cast?: string;
    country?: string;
    release_year?: number;
    rating?: string;
    duration?: string;
    description?: string;
    genres?: string[];
  }): Promise<MovieTitle | null> => {
    try {
      console.log('Creating new movie:', movieData);
      const response = await api.post('/movies', movieData);
      console.log('Movie created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating movie:', error);
      return null;
    }
  },
  
  // Update an existing movie (for admin use)
  updateMovie: async (
    id: string,
    movieData: {
      type: string;
      title: string;
      director?: string;
      cast?: string;
      country?: string;
      release_year?: number;
      rating?: string;
      duration?: string;
      description?: string;
      genres?: string[];
    }
  ): Promise<boolean> => {
    try {
      const response = await api.put(`/movies/${id}`, movieData);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error(`Error updating movie ${id}:`, error);
      return false;
    }
  },
  
  // Delete a movie (for admin use)
  deleteMovie: async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/movies/${id}`);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error(`Error deleting movie ${id}:`, error);
      return false;
    }
  },
  
  getMovieRecommendations: async (showId: string, userId?: number): Promise<MovieTitle[]> => {
    try {
        const params = userId ? `?userId=${userId}&count=10` : '?count=10'; // Add count=10 parameter
        const response = await api.get(`/movies/titles/${showId}/recommendations${params}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching recommendations for movie ${showId}:`, error);
        return [];
    }
  },

  // Get movie titles with pagination
  getMoviesPaged: async (
    page: number = 1, 
    pageSize: number = 20,
    genre?: string, 
    contentType?: string
  ): Promise<PaginatedResponse<MovieTitle>> => {
    try {
      // Pre-fetch all posters to avoid individual requests later
      if (!allPostersLoaded) {
        try {
          const postersResponse = await api.get('/posters');
          if (Array.isArray(postersResponse.data) && postersResponse.data.length > 0) {
            allPosterUrls = postersResponse.data;
            allPostersLoaded = true;
            console.log(`Pre-fetched ${allPosterUrls.length} poster URLs`);
          }
        } catch (error) {
          console.error('Error pre-fetching posters:', error);
        }
      }
      
      // Build params including optional filters
      const params: Record<string, any> = { page, pageSize };
      if (genre && genre !== 'All Genres') {
        params.genre = genre;
      }
      if (contentType && contentType !== 'All Types') {
        params.type = contentType; // Assuming backend uses 'type'
      }
      
      console.log(`Requesting page ${page} with pageSize ${pageSize}, filters:`, { genre, contentType });
      
      try {
        // Always use the paginated endpoint with the constructed params
        const response = await api.get<PaginatedResponse<MovieTitle>>('/movies/titles/paged', { params });
        
        console.log(`Fetched page ${page} of movies (${response.data.movies.length} items)`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching paginated movies (page ${page}) with filters:`, { genre, contentType, error });
        
        // Important: Return EMPTY results on error
        return {
          movies: [],
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1
          }
        };
      }
    } catch (error) {
      console.error(`Error in getMoviesPaged (page ${page}) with filters:`, { genre, contentType, error });
      // Return empty result on outer error
      return {
        movies: [],
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalPages: 0,
          totalCount: 0,
          hasNext: false,
          hasPrevious: page > 1
        }
      };
    }
  },

  // Get movies sorted by ID (for homepage carousel) to show different movies than the main listing
  getMoviesSortedById: async (
    page: number = 1, 
    pageSize: number = 10
  ): Promise<PaginatedResponse<MovieTitle>> => {
    try {
      // Build params for the request
      const params: Record<string, any> = { 
        page, 
        pageSize,
        sortBy: 'id' // Custom parameter to request ID sorting
      };
      
      // Try to get from the paginated endpoint with ID sorting
      const response = await api.get<PaginatedResponse<MovieTitle>>('/movies/titles/paged', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching movies sorted by ID (page ${page}):`, error);
      
      // Fallback: If the API doesn't support sorting by ID,
      // get regular paged results and sort them by ID on the client side
      try {
        const fallbackResponse = await api.get<PaginatedResponse<MovieTitle>>('/movies/titles/paged', { 
          params: { page, pageSize: pageSize * 2 } // Get more items to have variety
        });
        
        // Sort by ID (show_id)
        const sortedMovies = [...fallbackResponse.data.movies]
          .sort((a, b) => a.show_id.localeCompare(b.show_id))
          .slice(0, pageSize);
        
        // Return a modified response with the sorted movies
        return {
          movies: sortedMovies,
          pagination: {
            ...fallbackResponse.data.pagination,
            pageSize: pageSize
          }
        };
      } catch (fallbackError) {
        // Return empty result if all attempts fail
        return {
          movies: [],
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1
          }
        };
      }
    }
  },

  getCollaborativeRecommendations: async (userId: number): Promise<MovieTitle[]> => {
    try {
        const response = await api.get(`/recommendations/collaborative/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching collaborative recommendations for user ${userId}:`, error);
        return [];
    }
},

  // Get a single movie by ID
  getMovieById: async (id: string): Promise<MovieTitle | null> => {
    try {
      console.log(`Fetching movie with ID: ${id}`);
      const response = await api.get(`/movies/titles/${id}`);
      console.log(`Raw API response for movie ${id}:`, response.data);
      console.log(`Response contains Categories:`, response.data.Categories);
      console.log(`Response contains RuntimeMinutes:`, response.data.RuntimeMinutes);
      return response.data;
    } catch (error) {
      console.error(`Error fetching movie with ID ${id}:`, error);
      return null;
    }
  },

  // Get ratings for a specific movie
  getMovieRatings: async (id: string): Promise<MovieRating[]> => {
    try {
      const response = await api.get(`/movies/ratings/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ratings for movie with ID ${id}:`, error);
      return [];
    }
  },

  // Get average rating for a specific movie
  getMovieAverageRating: async (id: string): Promise<number> => {
    try {
      const response = await api.get(`/movies/ratings/average/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error calculating average rating for movie with ID ${id}:`, error);
      return 0;
    }
  },
  
  // Get movie poster URL - optimized with caching
  getMoviePosterUrl: async (title: string): Promise<string> => {
    if (!title) {
      console.warn('Empty title provided to getMoviePosterUrl');
      return `/images/placeholder-movie.jpg`;
    }

    // Check cache first
    if (posterCache[title]) {
      return posterCache[title];
    }

    // Pre-fetch all posters if we haven't already
    if (!allPostersLoaded || allPosterUrls.length === 0) {
      try {
        console.log(`Fetching all posters for title: "${title}"`);
        const postersResponse = await api.get('/posters');
        if (Array.isArray(postersResponse.data) && postersResponse.data.length > 0) {
          allPosterUrls = postersResponse.data;
          allPostersLoaded = true;
          console.log(`Fetched ${allPosterUrls.length} poster URLs`);
        }
      } catch (error) {
        console.error('Error fetching all posters:', error);
      }
    }

    // If we have posters, use our sophisticated matching algorithm
    if (allPostersLoaded && allPosterUrls.length > 0) {
      const bestMatch = findBestPosterMatch(title, allPosterUrls);
      posterCache[title] = bestMatch;
      return bestMatch;
    }

    // Fallback: direct API request for this specific title
    try {
      const response = await api.get(`/posters/${encodeURIComponent(title)}`);
      
      if (response.data && typeof response.data === 'object' && 'url' in response.data) {
        const posterUrl = response.data.url;
        posterCache[title] = posterUrl;
        return posterUrl;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // If we got an array back, use our matching algorithm
        const bestMatch = findBestPosterMatch(title, response.data);
        posterCache[title] = bestMatch;
        return bestMatch;
      }
      
      return `/images/placeholder-movie.jpg`;
    } catch (error) {
      console.error(`Error fetching poster for movie "${title}":`, error);
      return `/images/placeholder-movie.jpg`;
    }
  }
};

// Helper function to find the best poster match
function findBestPosterMatch(title: string, posters: string[]): string {
  if (!posters.length) return `/images/placeholder-movie.jpg`;
  
  console.log(`===== Finding match for title: "${title}" =====`);
  
  // For exact boundary checking (to prevent partial matches)
  const exactBoundaryMatch = (url: string, searchTerm: string) => {
    const urlLower = url.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    // Check if the search term is surrounded by non-word characters or is at the start/end
    const fileNameOnly = urlLower.split('/').pop() || '';
    return (
      // Match patterns like "/exact-title." or "/exact-title/"
      urlLower.includes(`/${searchLower}.`) || 
      urlLower.includes(`/${searchLower}/`) ||
      // Or match exact file name (accounting for extension)
      fileNameOnly === searchLower || 
      fileNameOnly.startsWith(`${searchLower}.`) ||
      // Or movie posters directory structure
      urlLower.includes(`movie posters/${searchLower}.`) ||
      urlLower.includes(`movie posters/${searchLower}/`)
    );
  };
  
  // Special case for apostrophe-starting titles
  if (title.startsWith("'")) {
    const titleWithoutApostrophe = title.substring(1);
    // First try to find exact matches with the apostrophe
    const exactApostropheMatch = posters.find(url => exactBoundaryMatch(url, title));
    if (exactApostropheMatch) {
      console.log(`Found exact match with apostrophe for "${title}": ${exactApostropheMatch}`);
      return exactApostropheMatch;
    }
    
    // Then try without the apostrophe
    const apostropheMatch = posters.find(url => exactBoundaryMatch(url, titleWithoutApostrophe));
    if (apostropheMatch) {
      console.log(`Found match without apostrophe for "${title}": ${apostropheMatch}`);
      return apostropheMatch;
    }
    
    // Finally try with just file name inclusion (non-boundary)
    const looseApostropheMatch = posters.find(url => 
      url.toLowerCase().includes(title.toLowerCase()) ||
      url.toLowerCase().includes(titleWithoutApostrophe.toLowerCase())
    );
    if (looseApostropheMatch) {
      console.log(`Found loose match for apostrophe title "${title}": ${looseApostropheMatch}`);
      return looseApostropheMatch;
    }
  }
  
  // Handle titles with leading # (common in some databases)
  let titleWithHash = title;
  let titleWithoutHash = title;
  if (title.startsWith('#')) {
    titleWithoutHash = title.substring(1);
  } else {
    titleWithHash = '#' + title;
  }
  
  // 1. Try exact boundary matches first for the original title
  const exactMatch = posters.find(url => exactBoundaryMatch(url, title));
  if (exactMatch) {
    console.log(`Found exact boundary match for "${title}": ${exactMatch}`);
    return exactMatch;
  }
  
  // 2. Try with hash variants for exact boundary matches
  const hashMatch = posters.find(url => 
    exactBoundaryMatch(url, titleWithoutHash) || 
    exactBoundaryMatch(url, titleWithHash)
  );
  if (hashMatch) {
    console.log(`Found exact hash variant match: ${hashMatch}`);
    return hashMatch;
  }
  
  // 3. Special case for sequels
  // Check if this looks like a sequel (ends with a number or roman numeral)
  const isSequel = /[\s\:]+([\d]+|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(title);
  
  if (isSequel) {
    // Extract the base name and sequel number
    const sequelMatch = title.match(/^(.+?)[\s\:]+(\d+|II|III|IV|V|VI|VII|VIII|IX|X)$/i);
    
    if (sequelMatch) {
      const baseTitle = sequelMatch[1].trim();
      const sequelNumber = sequelMatch[2];
      
      console.log(`Detected sequel: Base="${baseTitle}", Number="${sequelNumber}"`);
      
      // First try exact match with full title (highest priority)
      const exactFullTitleMatch = posters.find(url => 
        exactBoundaryMatch(url, title) ||
        // Also try with both # variants
        (title.startsWith('#') ? exactBoundaryMatch(url, titleWithoutHash) : exactBoundaryMatch(url, titleWithHash))
      );
      
      if (exactFullTitleMatch) {
        console.log(`Found exact match for full sequel title "${title}": ${exactFullTitleMatch}`);
        return exactFullTitleMatch;
      }
      
      // Next check for boundary matches that include both the base title and sequel number
      const sequelCompleteMatches = posters.filter(url => {
        const urlLower = url.toLowerCase();
        const fileNameOnly = urlLower.split('/').pop() || '';
        
        // Check if file name contains both components in the right order
        return fileNameOnly.includes(`${baseTitle.toLowerCase()} ${sequelNumber.toLowerCase()}`) ||
               fileNameOnly.includes(`${baseTitle.toLowerCase()}${sequelNumber.toLowerCase()}`);
      });
      
      if (sequelCompleteMatches.length > 0) {
        console.log(`Found boundary match for sequel "${title}": ${sequelCompleteMatches[0]}`);
        return sequelCompleteMatches[0];
      }
    }
  }
  
  // 4. For non-sequels, make sure we don't match sequels inadvertently
  if (!isSequel) {
    // Try to find exact non-sequel match
    const nonSequelMatches = posters.filter(url => {
      const urlLower = url.toLowerCase();
      const fileName = urlLower.split('/').pop() || '';
      const titleLower = title.toLowerCase();
      
      // Check for exact boundary match in file name
      if (fileName === titleLower || 
          fileName.startsWith(`${titleLower}.`)) {
        return true;
      }
      
      // Make sure no numbers or roman numerals follow the title
      const hasSequelIndicator = /[\s\:]+(\d+|ii|iii|iv|v|vi|vii|viii|ix|x)\b/i.test(fileName);
      
      return fileName.includes(titleLower) && !hasSequelIndicator;
    });
    
    if (nonSequelMatches.length > 0) {
      console.log(`Found non-sequel match for "${title}": ${nonSequelMatches[0]}`);
      return nonSequelMatches[0];
    }
  }
  
  // 5. Try with cleaned title (no special characters) with boundary checking
  const cleanTitle = title.replace(/[^\w\s]/gi, '').toLowerCase();
  const cleanMatch = posters.find(url => exactBoundaryMatch(url, cleanTitle));
  
  if (cleanMatch) {
    console.log(`Found clean boundary match for "${title}": ${cleanMatch}`);
    return cleanMatch;
  }
  
  // 6. Try looser matching if everything else fails
  // First try with basic inclusion
  const looseMatch = posters.find(url => 
    url.toLowerCase().includes(title.toLowerCase())
  );
  
  if (looseMatch) {
    console.log(`Found loose match for "${title}": ${looseMatch}`);
    return looseMatch;
  }
  
  // 7. Try partial word matching, prioritizing longer words
  const words = cleanTitle.split(/\s+/).filter(w => w.length > 2);
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  for (const word of sortedWords) {
    if (word.length < 3) continue;
    
    const partialMatch = posters.find(url => 
      url.toLowerCase().includes(word.toLowerCase())
    );
    
    if (partialMatch) {
      console.log(`Found word match "${word}" for "${title}": ${partialMatch}`);
      return partialMatch;
    }
  }
  
  // 8. Last resort - return the first poster
  console.log(`No match found for "${title}", returning first poster`);
  return posters[0];
}

// Debugging utility to find issues with poster matching
export const debugPosterMatching = async (title: string): Promise<void> => {
  console.log(`======== POSTER MATCHING DEBUG FOR: "${title}" ========`);
  
  try {
    // Get all posters
    if (!allPostersLoaded) {
      try {
        const postersResponse = await api.get('/posters');
        if (Array.isArray(postersResponse.data) && postersResponse.data.length > 0) {
          allPosterUrls = postersResponse.data;
          allPostersLoaded = true;
          console.log(`Loaded ${allPosterUrls.length} poster URLs for debugging`);
        }
      } catch (error) {
        console.error('Error loading posters for debugging:', error);
        return;
      }
    }
    
    // Extract potential matches
    const titleLower = title.toLowerCase();
    
    // Look for direct title match
    const exactMatches = allPosterUrls.filter(url => 
      url.toLowerCase().includes(titleLower)
    );
    
    console.log(`Direct matches for "${title}" (${exactMatches.length}):`);
    exactMatches.forEach(url => console.log(`  - ${url}`));
    
    // Try with hash variants
    let titleWithHash = title;
    let titleWithoutHash = title;
    if (title.startsWith('#')) {
      titleWithoutHash = title.substring(1);
    } else {
      titleWithHash = '#' + title;
    }
    
    const hashVariantMatches = allPosterUrls.filter(url => 
      url.toLowerCase().includes(titleWithHash.toLowerCase()) || 
      url.toLowerCase().includes(titleWithoutHash.toLowerCase())
    );
    
    if (hashVariantMatches.length > exactMatches.length) {
      console.log(`Hash variant matches for "${titleWithHash}" or "${titleWithoutHash}" (${hashVariantMatches.length}):`);
      hashVariantMatches
        .filter(url => !exactMatches.includes(url))
        .forEach(url => console.log(`  - ${url}`));
    }
    
    // Check if this is a sequel
    const sequelMatch = title.match(/^(.+?)[\s\:]+(\d+|II|III|IV|V|VI|VII|VIII|IX|X)$/i);
    if (sequelMatch) {
      const baseTitle = sequelMatch[1].trim();
      const sequelNumber = sequelMatch[2];
      
      console.log(`Sequel detected: Base="${baseTitle}", Number="${sequelNumber}"`);
      
      // Find posters with the base title (no sequel number)
      const baseTitleMatches = allPosterUrls.filter(url => 
        url.toLowerCase().includes(baseTitle.toLowerCase()) && 
        !url.toLowerCase().includes(sequelNumber.toLowerCase())
      );
      
      console.log(`Base title matches (without sequel number) for "${baseTitle}" (${baseTitleMatches.length}):`);
      baseTitleMatches.forEach(url => console.log(`  - ${url}`));
      
      // Find posters with both base title and sequel number
      const bothPartsMatches = allPosterUrls.filter(url => 
        url.toLowerCase().includes(baseTitle.toLowerCase()) && 
        url.toLowerCase().includes(sequelNumber.toLowerCase())
      );
      
      console.log(`Complete sequel matches for "${baseTitle}" and "${sequelNumber}" (${bothPartsMatches.length}):`);
      bothPartsMatches.forEach(url => console.log(`  - ${url}`));
    }
    
    // Finally, use our matching function to see what it would pick
    console.log(`\nBest match selected by algorithm:`, findBestPosterMatch(title, allPosterUrls));
    
  } catch (error) {
    console.error('Error during poster matching debug:', error);
  }
};

// API functions for users
export const usersApi = {
  // Get all users
  getAllUsers: async (): Promise<MovieUser[]> => {
    try {
      const response = await api.get('/movies/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Get a user by ID
  getUserById: async (id: number): Promise<MovieUser | null> => {
    try {
      const response = await api.get(`/movies/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return null;
    }
  },

  // Login (using the backend authentication)
  login: async (email: string, password: string): Promise<MovieUser | null> => {
    try {
      console.log(`Attempting login for email: ${email}`);
      
      // Try the test endpoint first to see if basic connectivity works
      try {
        console.log('Testing API connectivity...');
        const testResponse = await api.post('/auth/test-endpoint');
        console.log('Test endpoint response:', testResponse.data);
      } catch (testError) {
        console.error('Test endpoint failed:', testError);
      }
      
      // Try the database connectivity test
      try {
        console.log('Testing database connectivity...');
        const dbTestResponse = await api.post('/auth/debug-db', { email, password });
        console.log('Database test response:', dbTestResponse.data);
      } catch (dbError) {
        console.error('Database test failed:', dbError);
      }
      
      // Use the standard login endpoint
      const response = await api.post('/auth/login-with-password', {
        email,
        password
      });
      
      if (response.status === 200 && response.data) {
        console.log('Login successful');
        
        // The backend sends back a token and user info
        const { token, user } = response.data;
        
        // Store the token for future API calls
        localStorage.setItem('authToken', token);
        
        // Use the user object from the response
        return {
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          age: user.age || 0,
          gender: user.gender || '',
          city: user.city || '',
          state: user.state || '',
          password: '', // Don't store password
          isAdmin: user.isAdmin ? 1 : 0
        };
      } else {
        console.log('Login failed');
        return null;
      }
    } catch (error) {
      console.error('Error during login:', error);
      
      // Fall back to debug login if standard login fails
      try {
        console.log('Trying debug login as fallback');
        const debugResponse = await api.post('/auth/debug-login', {
          email,
          password
        });
        
        if (debugResponse.status === 200 && debugResponse.data) {
          console.log('Debug login successful');
          
          // The backend sends back a token and user info
          const { token, user } = debugResponse.data;
          
          // Store the token for future API calls
          localStorage.setItem('authToken', token);
          
          // Use the user object from the response
          return {
            user_id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            age: user.age || 0,
            gender: user.gender || '',
            city: user.city || '',
            state: user.state || '',
            password: '', // Don't store password
            isAdmin: user.isAdmin ? 1 : 0
          };
        }
      } catch (debugError) {
        console.error('Debug login also failed:', debugError);
      }
      
      return null;
    }
  },

  // Get user reviews
  getUserReviews: async (userId: number): Promise<MovieRating[]> => {
    try {
      const response = await api.get(`/ratings/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching reviews for user with ID ${userId}:`, error);
      // Fallback to localStorage if API fails
      try {
        const savedRatingsKey = `userRatings_${userId}`;
        const savedRatingsJson = localStorage.getItem(savedRatingsKey);
        if (savedRatingsJson) {
          return JSON.parse(savedRatingsJson);
        }
      } catch (e) {
        // If localStorage also fails, just return empty array
      }
      return [];
    }
  },

  // Add or update a movie rating
  addOrUpdateRating: async (userId: number, movieId: string, rating: number, review?: string): Promise<MovieRating | null> => {
    try {
      // Create the rating object
      const ratingData: MovieRating = {
        user_id: userId,
        show_id: movieId,
        rating: rating,
        review: review || ''
      };

      // Send to backend API
      const response = await api.post('/ratings', ratingData);
      
      // Also save to localStorage as backup
      try {
        const savedRatingsKey = `userRatings_${userId}`;
        let savedRatings: MovieRating[] = [];
        
        const savedRatingsJson = localStorage.getItem(savedRatingsKey);
        if (savedRatingsJson) {
          savedRatings = JSON.parse(savedRatingsJson);
        }
        
        const existingIndex = savedRatings.findIndex(r => r.show_id === movieId);
        
        if (existingIndex !== -1) {
          savedRatings[existingIndex].rating = rating;
          savedRatings[existingIndex].review = review || savedRatings[existingIndex].review || '';
        } else {
          savedRatings.push(ratingData);
        }
        
        localStorage.setItem(savedRatingsKey, JSON.stringify(savedRatings));
      } catch (e) {
        // Ignore localStorage errors since we've already sent to backend
      }
      
      return response.data || ratingData;
    } catch (error) {
      console.error(`Error adding/updating rating for movie ${movieId} by user ${userId}:`, error);
      return null;
    }
  },

  // Delete a movie rating
  deleteRating: async (userId: number, movieId: string): Promise<boolean> => {
    try {
      // Delete from backend
      await api.delete(`/ratings/${userId}/${movieId}`);
      
      // Also update localStorage
      try {
        const savedRatingsKey = `userRatings_${userId}`;
        const savedRatingsJson = localStorage.getItem(savedRatingsKey);
        if (savedRatingsJson) {
          const savedRatings = JSON.parse(savedRatingsJson);
          const updatedRatings = savedRatings.filter((r: MovieRating) => r.show_id !== movieId);
          localStorage.setItem(savedRatingsKey, JSON.stringify(updatedRatings));
        }
      } catch (e) {
        // Ignore localStorage errors since we've already deleted from backend
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting rating for movie ${movieId} by user ${userId}:`, error);
      return false;
    }
  },
};

// API functions for favorites
export const favoritesApi = {
  // Get favorites for a user
  getUserFavorites: async (userId: number): Promise<UserFavorite[]> => {
    try {
      const response = await api.get(`/movies/favorites/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching favorites for user with ID ${userId}:`, error);
      return [];
    }
  },

  // Add a movie to favorites
  addFavorite: async (userId: number, movieId: string): Promise<UserFavorite | null> => {
    try {
      const response = await api.post('/movies/favorites', {
        user_id: userId,
        movie_id: movieId
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding movie ${movieId} to favorites for user ${userId}:`, error);
      return null;
    }
  },

  // Remove a movie from favorites
  removeFavorite: async (userId: number, movieId: string): Promise<boolean> => {
    try {
      await api.delete(`/movies/favorites/${userId}/${movieId}`);
      return true;
    } catch (error) {
      console.error(`Error removing movie ${movieId} from favorites for user ${userId}:`, error);
      return false;
    }
  }
};

// API functions for watchlist
export const watchlistApi = {
  // Get watchlist for a user
  getUserWatchlist: async (userId: number): Promise<UserWatchlist[]> => {
    try {
      const response = await api.get(`/movies/watchlist/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching watchlist for user with ID ${userId}:`, error);
      return [];
    }
  },

  // Add a movie to watchlist
  addToWatchlist: async (userId: number, movieId: string): Promise<UserWatchlist | null> => {
    try {
      const response = await api.post('/movies/watchlist', {
        user_id: userId,
        movie_id: movieId
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding movie ${movieId} to watchlist for user ${userId}:`, error);
      return null;
    }
  },

  // Remove a movie from watchlist
  removeFromWatchlist: async (userId: number, movieId: string): Promise<boolean> => {
    try {
      await api.delete(`/movies/watchlist/${userId}/${movieId}`);
      return true;
    } catch (error) {
      console.error(`Error removing movie ${movieId} from watchlist for user ${userId}:`, error);
      return false;
    }
  }
};

// Function to force reload all posters (for debugging)
export const forceReloadPosters = async (): Promise<boolean> => {
  try {
    console.log("🔄 Forcing reload of all poster URLs...");
    allPostersLoaded = false;
    posterCache = {};
    
    const postersResponse = await api.get('/posters');
    if (Array.isArray(postersResponse.data) && postersResponse.data.length > 0) {
      allPosterUrls = postersResponse.data;
      allPostersLoaded = true;
      console.log(`✅ Successfully reloaded ${allPosterUrls.length} poster URLs`);
      return true;
    } else {
      console.error("❌ Received invalid data when reloading posters");
      return false;
    }
  } catch (error) {
    console.error("❌ Error reloading posters:", error);
    return false;
  }
};

export default api; 
