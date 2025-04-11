import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const RegisterProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get user and token from navigation state
  const { user, token } = location.state || {};

  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if user/token are missing (e.g., direct access to page)
  useEffect(() => {
    if (!user || !token) {
      console.warn('Missing user or token, redirecting to login.');
      navigate('/login');
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (age && (isNaN(parseInt(age)) || parseInt(age) < 13 || parseInt(age) > 120)) {
      setError('Please enter a valid age (13-120).');
      setLoading(false);
      return;
    }

    // Prepare profile data
    const profileData = {
      phone: phone || null,
      // Ensure age is number or null
      age: age ? parseInt(age) : null,
      gender: gender || null,
      city: city || null,
      state: state || null,
    };

    try {
      // Create axios instance with explicit HTTPS configuration
      const httpsClient = axios.create({
        baseURL: 'https://localhost:5213',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use the token received from step 1
        }
      });
      
      // Make the request
      const response = await httpsClient.put('/api/users/profile', profileData);

      if (response.status >= 200 && response.status < 300) {
        // Navigate to the main app (e.g., home) or login page after success
        // Maybe auto-login the user here? For now, let's go to login.
        navigate('/login?profileUpdated=true');
      } else {
        console.error('Profile update failed:', response.data);
        setError(response.data.message || 'Failed to update profile. Please try again later.');
      }
    } catch (err) {
      console.error('Network or unexpected error during profile update:', err);
      setError('Failed to connect to the server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render the form if user/token are missing (avoids errors before redirect)
  if (!user || !token) {
      return <div>Loading or redirecting...</div>; // Or a spinner component
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Profile Setup - Step 2</h1>
        <p className="auth-subheading">Welcome, {user.name}! Please provide some optional profile details.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Profile Fields Only */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input type="number" id="age" min="13" max="120" value={age} onChange={(e) => setAge(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} disabled={loading}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input type="text" id="state" value={state} onChange={(e) => setState(e.target.value)} disabled={loading} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Complete Registration'}
          </button>
        </form>
        {/* Optional: Add a skip button? */}
        {/* <button type="button" className="btn-secondary" onClick={() => navigate('/login')}>Skip for now</button> */}
      </div>
    </div>
  );
};

export default RegisterProfilePage; 