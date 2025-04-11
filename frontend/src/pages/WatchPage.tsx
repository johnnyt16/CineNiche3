import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, SkipBack, SkipForward, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Pencil, Heart, Bookmark, Plus, Info } from 'lucide-react';
import { moviesApi } from '../services/api';

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

const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch movie data from API
        const movieData = await moviesApi.getMovieById(id);
        
        if (movieData) {
          // Get poster URL
          const posterUrl = await moviesApi.getMoviePosterUrl(movieData.title || '') || '/images/placeholder-movie.jpg';
          
          // Process cast array
          let castArray: string[] = ['Unknown Cast'];
          if (movieData.cast) {
            if (movieData.cast.includes(',')) {
              castArray = movieData.cast.split(',').map(actor => actor.trim());
            } else {
              const words = movieData.cast.trim().split(/\s+/);
              castArray = [];
              for (let i = 0; i < words.length; i += 2) {
                if (i + 1 < words.length) {
                  castArray.push(`${words[i]} ${words[i + 1]}`);
                } else {
                  castArray.push(words[i]);
                }
              }
              if (castArray.length === 0) {
                castArray = ['Unknown Cast'];
              }
            }
          }
          
          // Get genre from categories
          const categories = movieData.Categories || movieData.categories || [];
          const genre = categories.length > 0 ? categories.join(', ') : 'Unknown';
          
          // Check for runtime in both camelCase and PascalCase
          const runtime = movieData.RuntimeMinutes || movieData.runtimeMinutes || 90; // Default to 90 mins
          
          // Create movie object
          const movie: Movie = {
            id: movieData.show_id,
            title: movieData.title || 'Unknown Title',
            imageUrl: posterUrl,
            genre: genre,
            year: movieData.release_year || 0,
            director: movieData.director || 'Unknown',
            cast: castArray,
            country: movieData.country || 'Unknown',
            description: movieData.description || 'No description available.',
            contentRating: movieData.rating || 'NR',
            runtime: runtime,
            averageRating: 0,
            ratingCount: 0
          };
          
          setMovie(movie);
          document.title = `Watch: ${movie.title} | CineNiche`;
          
          // Set up fake duration based on movie runtime
          const totalMinutes = movie.runtime;
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          setDuration(`${hours}:${minutes < 10 ? '0' + minutes : minutes}:00`);
          setCurrentTime('0:00:00');
        } else {
          console.error('Movie not found:', id);
        }
      } catch (error) {
        console.error('Error fetching movie:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovie();
  }, [id]);
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    
    // If we start playing, simulate progress
    if (!isPlaying) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 0.1;
          if (newProgress >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 100;
          }
          // Update current time
          const totalSeconds = movie ? movie.runtime * 60 * (newProgress / 100) : 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = Math.floor(totalSeconds % 60);
          setCurrentTime(`${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
          return newProgress;
        });
      }, 1000);
      
      // Clean up interval on component unmount
      return () => clearInterval(interval);
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setProgress(percentage);
    
    // Update current time based on percentage
    const totalSeconds = movie ? movie.runtime * 60 * (percentage / 100) : 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    setCurrentTime(`${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
  };
  
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  const handleBackToDetails = () => {
    navigate(`/movies/${id}`);
  };
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading movie player...</div>
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
  
  return (
    <div className="watch-page">
      <div className="watch-container">
        <div className="watch-header">
          <div className="watch-info">
            <h2>{movie.title}</h2>
            <div className="watch-meta">
              <span className="watch-year">{movie.year}</span>
              <span className="watch-rating">{movie.contentRating}</span>
              <span className="watch-runtime">{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
            </div>
          </div>
          <button 
            className="watch-back-button"
            onClick={handleBackToDetails}
          >
            <ArrowLeft size={20} /> Back
          </button>
        </div>
        
        <div className="player-container">
          <div className="video-container" ref={videoContainerRef}>
            <img src={movie.imageUrl} alt={movie.title} className="video-poster" />
            
            {!isPlaying && (
              <div className="play-overlay" onClick={togglePlay}>
                <div className="play-button">
                  <Play size={48} />
                </div>
              </div>
            )}
            
            <div className={`movie-title-overlay ${isPlaying ? 'fade' : ''}`}>
              <h1>{movie.title} ({movie.year})</h1>
            </div>
            
            <div className="player-controls">
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  onClick={handleProgressBarClick}
                >
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <div 
                    className="progress-thumb" 
                    style={{ left: `${progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="controls-row">
                <div className="left-controls">
                  <button className="control-button" onClick={togglePlay}>
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button className="control-button">
                    <SkipBack size={20} />
                  </button>
                  <button className="control-button">
                    <SkipForward size={20} />
                  </button>
                  <button className="control-button" onClick={toggleMute}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="time-display">
                    <span>{currentTime} / {duration}</span>
                  </div>
                </div>
                
                <div className="right-controls">
                  <button className="control-button">
                    <Settings size={20} />
                  </button>
                  <button className="control-button" onClick={toggleFullscreen}>
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage; 