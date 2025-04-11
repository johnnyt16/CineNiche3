import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { usersApi, MovieUser, favoritesApi, watchlistApi, moviesApi, MovieRating } from '../services/api';

// Define user type
export interface User {
  id: number;
  name: string;
  email: string;
  initials: string;
  isAdmin?: boolean;
  phone?: string;
  age?: number;
  gender?: string;
  city?: string;
  state?: string;
}

// Define reviewed movie type
export interface ReviewedMovie {
  id: string;
  title: string;
  imageUrl: string;
  genre: string;
  year: number;
  rating: number; // 1-5 stars
  review: string;
}

// Define movie type for favorites and watchlist
export interface MovieItem {
  id: string;
  title: string;
  imageUrl: string;
  genre: string;
  year: number;
}

// Define authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  reviewedMovies: ReviewedMovie[];
  favorites: MovieItem[];
  watchlist: MovieItem[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addReview: (review: ReviewedMovie) => void;
  loadUserReviews: (userId: number) => Promise<void>;
  toggleFavorite: (movie: MovieItem) => Promise<void>;
  toggleWatchlist: (movie: MovieItem) => Promise<void>;
  isInFavorites: (movieId: string) => boolean;
  isInWatchlist: (movieId: string) => boolean;
  isAdmin: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  reviewedMovies: [],
  favorites: [],
  watchlist: [],
  login: async () => false,
  logout: () => {},
  addReview: () => {},
  loadUserReviews: async () => {},
  toggleFavorite: async () => {},
  toggleWatchlist: async () => {},
  isInFavorites: () => false,
  isInWatchlist: () => false,
  isAdmin: false,
});

// Sample reviewed movies
const sampleReviewedMovies: ReviewedMovie[] = [
  // We'll get rid of these sample reviews
];

// Helper to convert API data to MovieItem
const convertToMovieItem = async (movieId: string): Promise<MovieItem | null> => {
  try {
    const movieData = await moviesApi.getMovieById(movieId);
    if (movieData) {
      return {
        id: movieData.show_id,
        title: movieData.title || 'Untitled',
        imageUrl: `/images/placeholder-movie.jpg`, // Use local placeholder in images folder
        genre: 'Drama', // Default genre since backend doesn't have this yet
        year: movieData.release_year || 0
      };
    }
    return null;
  } catch (error) {
    console.error(`Error converting movie ${movieId} to MovieItem:`, error);
    return null;
  }
};

// Helper function to get initials from a name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

// Define provider component
export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [reviewedMovies, setReviewedMovies] = useState<ReviewedMovie[]>([]);
  const [favorites, setFavorites] = useState<MovieItem[]>([]);
  const [watchlist, setWatchlist] = useState<MovieItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper to convert API data to ReviewedMovie
  const convertToReviewedMovie = async (rating: MovieRating): Promise<ReviewedMovie | null> => {
    try {
      const movieData = await moviesApi.getMovieById(rating.show_id);
      
      // If movie data is found, use it
      if (movieData) {
        const posterUrl = await moviesApi.getMoviePosterUrl(movieData.title || '');
        return {
          id: movieData.show_id,
          title: movieData.title || 'Untitled',
          imageUrl: posterUrl || '/images/placeholder-movie.jpg',
          genre: movieData.categories?.[0] || 'Drama', // Use first category as genre
          year: movieData.release_year || 0,
          rating: rating.rating,
          review: rating.review || movieData.description || 'No review text available.'
        };
      } else {
        // If movie data is not found, create a minimal placeholder
        return {
          id: rating.show_id,
          title: `Movie ${rating.show_id}`,
          imageUrl: '/images/placeholder-movie.jpg',
          genre: 'Unknown',
          year: 0,
          rating: rating.rating,
          review: rating.review || 'This is your rating for this movie.'
        };
      }
    } catch (error) {
      console.error(`Error converting rating ${rating.show_id} to ReviewedMovie:`, error);
      // Return a minimal placeholder on error
      return {
        id: rating.show_id,
        title: `Movie ${rating.show_id}`,
        imageUrl: '/images/placeholder-movie.jpg',
        genre: 'Unknown',
        year: 0,
        rating: rating.rating,
        review: rating.review || 'This is your rating for this movie.'
      };
    }
  };

  // Load user's reviews from the API
  const loadUserReviews = async (userId: number) => {
    try {
      const userRatings = await usersApi.getUserReviews(userId);
      if (userRatings.length > 0) {
        const reviewItems: ReviewedMovie[] = [];
        
        // Convert each rating to a ReviewedMovie
        for (const rating of userRatings) {
          const reviewItem = await convertToReviewedMovie(rating);
          if (reviewItem) {
            reviewItems.push(reviewItem);
          }
        }
        
        setReviewedMovies(reviewItems);
        localStorage.setItem('userReviews', JSON.stringify(reviewItems));
      } else {
        // User has no reviews
        setReviewedMovies([]);
        localStorage.setItem('userReviews', JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error loading user reviews:', error);
      setReviewedMovies([]);
      localStorage.setItem('userReviews', JSON.stringify([]));
    }
  };

  // Check for saved auth state on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setIsAdmin(parsedUser.isAdmin || false);
        
        // Load saved reviews from localStorage
        const savedReviews = localStorage.getItem('userReviews');
        if (savedReviews) {
          setReviewedMovies(JSON.parse(savedReviews));
        }
        
        // Load user's favorites, watchlist, and reviews from the database
        if (parsedUser.id) {
          loadUserFavorites(parsedUser.id);
          loadUserWatchlist(parsedUser.id);
          loadUserReviews(parsedUser.id);
        }
      } catch (e) {
        console.error('Error parsing saved user', e);
        localStorage.removeItem('user');
        localStorage.removeItem('userReviews');
      }
    }
  }, []);

  // Load user's favorites from the API
  const loadUserFavorites = async (userId: number) => {
    try {
      const userFavorites = await favoritesApi.getUserFavorites(userId);
      if (userFavorites.length > 0) {
        const favoriteItems: MovieItem[] = [];
        
        // Convert each favorite to a MovieItem
        for (const favorite of userFavorites) {
          const movieItem = await convertToMovieItem(favorite.movie_id);
          if (movieItem) {
            favoriteItems.push(movieItem);
          }
        }
        
        setFavorites(favoriteItems);
      }
    } catch (error) {
      console.error('Error loading user favorites:', error);
    }
  };
  
  // Load user's watchlist from the API
  const loadUserWatchlist = async (userId: number) => {
    try {
      const userWatchlist = await watchlistApi.getUserWatchlist(userId);
      if (userWatchlist.length > 0) {
        const watchlistItems: MovieItem[] = [];
        
        // Convert each watchlist item to a MovieItem
        for (const item of userWatchlist) {
          const movieItem = await convertToMovieItem(item.movie_id);
          if (movieItem) {
            watchlistItems.push(movieItem);
          }
        }
        
        setWatchlist(watchlistItems);
      }
    } catch (error) {
      console.error('Error loading user watchlist:', error);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Call the API to authenticate
      const userData = await usersApi.login(email, password);
      
      if (userData) {
        // Convert the backend user model to our frontend user model
        const userModel: User = {
          id: userData.user_id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          age: userData.age,
          gender: userData.gender,
          city: userData.city,
          state: userData.state,
          // Create initials from name
          initials: userData.name.split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase(),
          // Use the isAdmin flag from the database
          isAdmin: userData.isAdmin === 1
        };
        
        setUser(userModel);
        setIsAuthenticated(true);
        setIsAdmin(userModel.isAdmin || false);
        
        // Save user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(userModel));
        
        // Load the user's favorites, watchlist, and reviews from the database
        await loadUserFavorites(userModel.id);
        await loadUserWatchlist(userModel.id);
        await loadUserReviews(userModel.id);
        
        console.log('User logged in:', email);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setReviewedMovies([]);
    setFavorites([]);
    setWatchlist([]);
    setIsAdmin(false);
    
    // Clear saved auth state
    localStorage.removeItem('user');
    // We don't remove reviews on logout so they persist
    // localStorage.removeItem('userReviews');
    
    console.log('User logged out');
  };

  // Add review function
  const addReview = (review: ReviewedMovie) => {
    // Check if movie is already reviewed
    const existingIndex = reviewedMovies.findIndex(m => m.id === review.id);
    
    let updatedReviews;
    if (existingIndex !== -1) {
      // Update existing review
      updatedReviews = [...reviewedMovies];
      updatedReviews[existingIndex] = review;
    } else {
      // Add new review
      updatedReviews = [...reviewedMovies, review];
    }
    
    // Update state
    setReviewedMovies(updatedReviews);
    
    // Save to localStorage
    localStorage.setItem('userReviews', JSON.stringify(updatedReviews));
  };

  // Toggle favorite function
  const toggleFavorite = async (movie: MovieItem) => {
    if (!user) return;
    
    const existingIndex = favorites.findIndex(m => m.id === movie.id);
    
    if (existingIndex !== -1) {
      // Remove from favorites
      const result = await favoritesApi.removeFavorite(user.id, movie.id);
      
      if (result) {
        const updatedFavorites = favorites.filter(m => m.id !== movie.id);
        setFavorites(updatedFavorites);
      }
    } else {
      // Add to favorites
      const result = await favoritesApi.addFavorite(user.id, movie.id);
      
      if (result) {
        setFavorites([...favorites, movie]);
      }
    }
  };

  // Toggle watchlist function
  const toggleWatchlist = async (movie: MovieItem) => {
    if (!user) return;
    
    const existingIndex = watchlist.findIndex(m => m.id === movie.id);
    
    if (existingIndex !== -1) {
      // Remove from watchlist
      const result = await watchlistApi.removeFromWatchlist(user.id, movie.id);
      
      if (result) {
        const updatedWatchlist = watchlist.filter(m => m.id !== movie.id);
        setWatchlist(updatedWatchlist);
      }
    } else {
      // Add to watchlist
      const result = await watchlistApi.addToWatchlist(user.id, movie.id);
      
      if (result) {
        setWatchlist([...watchlist, movie]);
      }
    }
  };

  // Check if movie is in favorites
  const isInFavorites = (movieId: string): boolean => {
    return favorites.some(m => m.id === movieId);
  };

  // Check if movie is in watchlist
  const isInWatchlist = (movieId: string): boolean => {
    return watchlist.some(m => m.id === movieId);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      reviewedMovies, 
      favorites,
      watchlist,
      login, 
      logout, 
      addReview,
      loadUserReviews,
      toggleFavorite,
      toggleWatchlist,
      isInFavorites,
      isInWatchlist,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook for easy context use
export const useAuth = () => useContext(AuthContext); 