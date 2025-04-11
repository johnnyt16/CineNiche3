import React from 'react';
import { Link,useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleFooterClick = (path: string) => {
    navigate(path); // Navigate first
    setTimeout(() => { // Small delay to ensure DOM update
      window.scrollTo(0, 0);
    }, 10);
  };

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-section">
            <h3>CineNiche</h3>
            <p>Your destination for rare and independent cinema. Discover films that challenge, inspire, and expand your horizons.</p>
          </div>
          
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li onClick={() => handleFooterClick('/')}><Link to="/">Home</Link></li>
              <li onClick={() => handleFooterClick('/movies')}><Link to="/movies">Movies</Link></li>
              <li onClick={() => handleFooterClick('/login')}><Link to="/login">Login</Link></li>
              <li onClick={() => handleFooterClick('/register')}><Link to="/register">Sign Up</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Legal</h3>
            <ul className="footer-links">
              <li onClick={() => handleFooterClick('/privacy')}><Link to="/privacy">Privacy Policy</Link></li>
              <li onClick={() => handleFooterClick('/terms')}><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Connect</h3>
            <div className="social-links">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-x"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-inner">
          <p>&copy; {new Date().getFullYear()} CineNiche. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 