import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../cineniche-high-resolution-logo-transparent.png';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling to document
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    closeMenu();
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <img src={logo} alt="CineNiche Logo" className="logo-image" />
        </Link>
        
        <div className="menu-icon" onClick={toggleMenu}>
          <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
        </div>
        
        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Home
            </Link>
          </li>
          
          <li className="nav-item">
            <Link 
              to="/movies" 
              className={`nav-link ${location.pathname.includes('/movies') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Movies
            </Link>
          </li>
          
          {isAuthenticated && (
            <li className="nav-item">
              <Link 
                to="/my-reviews" 
                className={`nav-link ${location.pathname === '/my-reviews' ? 'active' : ''}`}
                onClick={closeMenu}
              >
                My Reviews
              </Link>
            </li>
          )}
          
          {!isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link 
                  to="/login" 
                  className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Login
                </Link>
              </li>
              
              <li className="nav-item">
                <Link 
                  to="/register" 
                  className="btn-primary nav-btn"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </li>
            </>
          ) : (
            <li className="nav-item">
              <div className="user-avatar" onClick={toggleDropdown}>
                {user?.initials}
              </div>
              
              {isDropdownOpen && (
                <div className="user-dropdown" ref={dropdownRef}>
                  <ul className="user-dropdown-menu">
                    <li>
                      <button onClick={handleProfileClick}>
                        Profile
                      </button>
                    </li>
                    <li>
                      <button onClick={handleLogout} className="logout-button">
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar; 