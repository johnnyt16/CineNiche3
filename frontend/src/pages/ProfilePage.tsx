import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pencil, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import TwoFactorAuth from '../components/TwoFactorAuth';

// Sample user extended data - in a real app this would come from the backend
const sampleUserExtendedData = {
  phone: '(555) 123-4567',
  birthday: '1990-05-15',
  gender: 'Male',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94105'
};

const ProfilePage: React.FC = () => {
  const { user, favorites, watchlist } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showTwoFactorAuth, setShowTwoFactorAuth] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [editedPhone, setEditedPhone] = useState(sampleUserExtendedData.phone);
  const [editedBirthday, setEditedBirthday] = useState(sampleUserExtendedData.birthday);
  const [editedGender, setEditedGender] = useState(sampleUserExtendedData.gender);
  const [editedCity, setEditedCity] = useState(sampleUserExtendedData.city);
  const [editedState, setEditedState] = useState(sampleUserExtendedData.state);
  const [editedZipCode, setEditedZipCode] = useState(sampleUserExtendedData.zipCode);
  
  // Check if 2FA is enabled from localStorage
  useEffect(() => {
    const storedStatus = localStorage.getItem('mock2FAStatus');
    if (storedStatus === 'enabled') {
      setIs2FAEnabled(true);
    }
  }, []);

  if (!user) {
    return <Navigate to="/" />;
  }
  
  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes would go here in a real app
      // For now, we'll just toggle the editing state
    }
    setIsEditing(!isEditing);
  };

  const handle2FAToggle = () => {
    if (is2FAEnabled) {
      // If 2FA is enabled, prompt to confirm disabling
      if (window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        localStorage.removeItem('mock2FAStatus');
        localStorage.removeItem('mock2FAPhone');
        setIs2FAEnabled(false);
      }
    } else {
      // If 2FA is not enabled, show the setup form
      setShowTwoFactorAuth(true);
    }
  };

  const handleTwoFactorAuthComplete = () => {
    setIs2FAEnabled(true);
    setShowTwoFactorAuth(false);
  };
  
  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">My Profile</h1>
        
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.initials}
            </div>
            <div className="profile-info">
              {isEditing ? (
                <div className="profile-edit-form">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2>{user?.name}</h2>
                  <p className="profile-email">{user?.email}</p>
                </>
              )}
            </div>
            <button 
              className={`btn-secondary ${isEditing ? 'save-btn' : 'edit-btn'}`}
              onClick={handleEditToggle}
            >
              {isEditing ? 'Save Changes' : <Pencil size={18} />}
            </button>
          </div>
          
          <div className="profile-section">
            <h3>Account Information</h3>
            {isEditing ? (
              <div className="profile-edit-form">
                <div className="edit-form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="birthday">Birthday</label>
                    <input
                      id="birthday"
                      type="date"
                      value={editedBirthday}
                      onChange={(e) => setEditedBirthday(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    value={editedGender}
                    onChange={(e) => setEditedGender(e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                
                <div className="location-fields">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      id="city"
                      type="text"
                      value={editedCity}
                      onChange={(e) => setEditedCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State</label>
                    <input
                      id="state"
                      type="text"
                      value={editedState}
                      onChange={(e) => setEditedState(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">Zip Code</label>
                    <input
                      id="zipCode"
                      type="text"
                      value={editedZipCode}
                      onChange={(e) => setEditedZipCode(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-details">
                <div className="profile-detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{user?.name}</span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user?.email}</span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{sampleUserExtendedData.phone}</span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Birthday</span>
                  <span className="detail-value">{new Date(sampleUserExtendedData.birthday).toLocaleDateString()}</span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Gender</span>
                  <span className="detail-value">{sampleUserExtendedData.gender}</span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">
                    {sampleUserExtendedData.city}, {sampleUserExtendedData.state} {sampleUserExtendedData.zipCode}
                  </span>
                </div>
                
                <div className="profile-detail-item">
                  <span className="detail-label">Member Since</span>
                  <span className="detail-value">April 2023</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Security Section for 2FA */}
          <div className="profile-section">
            <div className="section-header">
              <h3>Security Settings</h3>
              <div className="toggle-container">
                <span className="toggle-label">Two-Factor Authentication</span>
                <button className="toggle-button" onClick={handle2FAToggle}>
                  {is2FAEnabled ? (
                    <ToggleRight size={36} className="toggle-icon toggle-on" />
                  ) : (
                    <ToggleLeft size={36} className="toggle-icon toggle-off" />
                  )}
                </button>
              </div>
            </div>
            
            {showTwoFactorAuth && !is2FAEnabled && (
              <div className="security-settings">
                <div className="security-setting-item">
                  <p>Add an extra layer of security to your account with two-factor authentication.</p>
                  <TwoFactorAuth onComplete={handleTwoFactorAuthComplete} />
                </div>
              </div>
            )}
          </div>
          
          <div className="profile-section">
            <h3>Account Stats</h3>
            <div className="profile-stats">
              <div className="stat-card">
                <Link to="/my-reviews" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="stat-number">0</span>
                  <span className="stat-label">Reviews</span>
                </Link>
              </div>
              
              <div className="stat-card">
                <span className="stat-number">{favorites.length}</span>
                <span className="stat-label">Favorites</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-number">{watchlist.length}</span>
                <span className="stat-label">Watchlist</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 