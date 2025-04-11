import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImage from '../cineniche-high-resolution2.png';
import { moviesApi, MovieTitle } from '../services/api';
import { Film, Star, Users } from 'lucide-react';

interface Movie {
    id: string;
    title: string;
    poster: string;
}

const convertToMovie = async (movie: MovieTitle): Promise<Movie> => {
    let poster = '';
    try {
        poster = await moviesApi.getMoviePosterUrl(movie.title ?? 'Untitled');
    } catch (error) {
        console.error(`Error fetching poster for ${movie.title ?? 'Untitled'}`, error);
    }

    return {
        id: movie.show_id,
        title: movie.title?.replace(/^#+/, '') ?? 'Untitled',
        poster: poster || 'https://via.placeholder.com/300x450?text=No+Image'
    };
};

const HomePage: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const carouselRef = useRef<HTMLDivElement>(null);
    const recommendedCarouselRef = useRef<HTMLDivElement>(null);
    const [movieImages, setMovieImages] = useState<Movie[]>([]);
    const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [isRecommendedPaused, setIsRecommendedPaused] = useState(false);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await moviesApi.getMoviesSortedById(1, 10);
                const movies = await Promise.all(response.movies.map(convertToMovie));
                setMovieImages([...movies, ...movies]);
            } catch (err) {
                console.error('Failed to fetch recent movies:', err);
            }
        };

        const fetchRecommendations = async () => {
            if (!user?.id) return;
            try {
                const recs = await moviesApi.getCollaborativeRecommendations(user.id);
                const recommended = await Promise.all(recs.map(convertToMovie));
                setRecommendedMovies([...recommended, ...recommended]);
            } catch (err) {
                console.error('Failed to fetch recommended movies:', err);
            }
        };

        fetchMovies();
        fetchRecommendations();
    }, [user]);

    const useInfiniteScroll = (ref: React.RefObject<HTMLDivElement>, paused: boolean, direction: 'left' | 'right') => {
        useEffect(() => {
            let animationFrameId: number;
            const scrollSpeed = direction === 'left' ? -0.5 : 0.5;

            const scroll = () => {
                if (ref.current && !paused) {
                    ref.current.scrollLeft += scrollSpeed;

                    if (scrollSpeed > 0 && ref.current.scrollLeft >= ref.current.scrollWidth / 2) {
                        ref.current.scrollLeft = 0;
                    } else if (scrollSpeed < 0 && ref.current.scrollLeft <= 0) {
                        ref.current.scrollLeft = ref.current.scrollWidth / 2;
                    }
                }
                animationFrameId = requestAnimationFrame(scroll);
            };

            animationFrameId = requestAnimationFrame(scroll);
            return () => cancelAnimationFrame(animationFrameId);
        }, [ref, paused, direction]);
    };

    useInfiniteScroll(carouselRef, isPaused, 'right');
    useInfiniteScroll(recommendedCarouselRef, isRecommendedPaused, 'left');

    return (
        <div className="home-page">
            <div className="full-width-hero">
                <div className="hero-overlay">
                    <div className="hero-content">
                        {isAuthenticated ? (
                            <h1>Welcome, {user?.name.split(' ')[0]}</h1>
                        ) : (
                            <div className="welcome-container">
                                <h1>Welcome to</h1>
                                <img src={logoImage} alt="CineNiche" className="welcome-logo" />
                            </div>
                        )}
                        <p>Discover the world's most intriguing cult classics and rare films from our collection of over 8,000 titles</p>
                        <Link to="/movies" className="btn-explore">Explore Collection</Link>
                    </div>
                </div>
            </div>

            {isAuthenticated && recommendedMovies.length > 0 && (
                <div className="featured-films-section recommended-section">
                    <div className="section-header container">
                        <h2>Recommended For You</h2>
                    </div>
                    <div
                        className="film-scroll-container overflow-hidden"
                        ref={recommendedCarouselRef}
                        onMouseEnter={() => setIsRecommendedPaused(true)}
                        onMouseLeave={() => setIsRecommendedPaused(false)}
                    >
                        <div className="film-scroll-track flex gap-4 w-max">
                            {[...recommendedMovies, ...recommendedMovies].map((movie, idx) => (
                                <Link to={`/movies/${movie.id}`} key={`rec-${movie.id}-${idx}`} className="film-item flex-none w-48">
                                    <img src={movie.poster} alt={movie.title} />
                                    <p>{movie.title}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="featured-films-section">
                <div className="section-header container text-center">
                    <h2 className="text-center">Recently Added</h2>
                </div>
                <div
                    className="film-scroll-container overflow-hidden"
                    ref={carouselRef}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className="film-scroll-track flex gap-4 w-max">
                        {[...movieImages, ...movieImages].map((movie, idx) => (
                            <Link to={`/movies/${movie.id}`} key={`recent-${movie.id}-${idx}`} className="film-item flex-none w-48">
                                <img src={movie.poster} alt={movie.title} />
                                <p>{movie.title}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Feature Highlights Section - Moved after Recently Added */}
            <div className="features-section compact-top">
                <div className="container">
                    <div className="features-grid">
                        <div className="feature-card enhanced">
                            <div className="feature-icon">
                                <Film size={36} />
                            </div>
                            <h3>Curated Collection</h3>
                            <p>Access our carefully curated library of rare cult classics, independent gems, and international masterpieces that you won't find on mainstream platforms.</p>
                        </div>

                        <div className="feature-card enhanced blue">
                            <div className="feature-icon">
                                <Star size={36} />
                            </div>
                            <h3>Personalized Recommendations</h3>
                            <p>Our advanced algorithm learns your taste in film and suggests hidden treasures tailored to your unique preferences and viewing history.</p>
                        </div>

                        <div className="feature-card enhanced purple">
                            <div className="feature-icon">
                                <Users size={36} />
                            </div>
                            <h3>Cinephile Community</h3>
                            <p>Join a passionate community of film enthusiasts. Read and share in-depth reviews, create watchlists, and discover new favorites through authentic recommendations.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
