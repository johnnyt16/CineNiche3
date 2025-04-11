import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moviesApi } from '../services/api';

// Define Genre options
const genreOptions = [
  'Action', 'Adventure', 'Anime', 'British TV', 'Children', 
  'Comedy', 'Crime', 'Documentary', 'Docuseries', 'Drama', 
  'Family', 'Fantasy', 'Horror', 'International', 'Musical',
  'Nature', 'Reality TV', 'Romance', 'Spirituality', 
  'Talk Show', 'Thriller'
];

const AddMoviePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('https://via.placeholder.com/300x450?text=New+Movie');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [director, setDirector] = useState('');
  const [castInput, setCastInput] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [contentRating, setContentRating] = useState('');
  const [runtime, setRuntime] = useState(90); // Default to 90 minutes
  const [type, setType] = useState('Movie'); // Default to Movie
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if not authenticated or not admin
  React.useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/movies');
    }
  }, [isAuthenticated, isAdmin, navigate]);
  
  // Handle cast input
  const handleCastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCastInput(e.target.value);
  };

  // Handle genre selection
  const handleGenreChange = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare duration in the correct format
      const duration = `${runtime} min`;
      
      // Create a new movie using the API
      const result = await moviesApi.createMovie({
        title,
        type,
        director,
        cast: castInput,
        country,
        release_year: year,
        rating: contentRating,
        duration,
        description,
        genres: selectedGenres
      });
      
      if (result) {
        // Redirect to the new movie's detail page
        navigate(`/movies/${result.show_id}`);
      } else {
        setError('Failed to create movie. Please try again.');
      }
    } catch (err) {
      console.error('Error creating movie:', err);
      setError('An error occurred while creating the movie.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="movie-detail-page">
      <div className="container">
        <div className="movie-header">
          <Link to="/movies" className="back-button">Back to Movies</Link>
        </div>
        
        <div className="admin-edit-form">
          <h2>Add New Movie</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
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
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="Movie">Movie</option>
                    <option value="TV Show">TV Show</option>
                    <option value="Documentary">Documentary</option>
                  </select>
                </div>
                
                <div className="form-row">
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
                
                <div className="form-group">
                  <label>Genres</label>
                  <div className="genre-checkboxes">
                    {genreOptions.map(genre => (
                      <div key={genre} className="genre-checkbox">
                        <input
                          type="checkbox"
                          id={`genre-${genre}`}
                          checked={selectedGenres.includes(genre)}
                          onChange={() => handleGenreChange(genre)}
                        />
                        <label htmlFor={`genre-${genre}`}>{genre}</label>
                      </div>
                    ))}
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
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Add Movie'}
              </button>
              <button
                type="button" 
                className="btn-secondary"
                onClick={() => navigate('/movies')}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMoviePage; 