import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from auth context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const registrationData = {
      email: email,
      password: password,
      username: name
    };

    try {
      // Create axios instance with explicit HTTPS configuration
      const httpClient = axios.create({
        baseURL: 'https://localhost:5213',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Make the request
      const response = await httpClient.post('/api/auth/register', registrationData);

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;

        if (result.user && result.token) {
          // Store the auth token
          localStorage.setItem('authToken', result.token);
          
          // Use the login function to set the user's authenticated state
          const success = await login(email, password);
          
          if (success) {
            // Redirect to home page after successful login
            navigate('/');
          } else {
            // If automatic login fails, redirect to profile setup with the user data
            navigate('/register-profile', {
              state: { user: result.user, token: result.token }
            });
          }
        } else {
          console.error('Registration response missing user or token:', result);
          setError('Registration succeeded but failed to get authentication details. Please try logging in.');
          setLoading(false);
        }
        return;
      } else {
        console.error('Registration failed:', response.data);
        if (response.status === 409) {
          setError(response.data.message || 'Email address is already registered.');
        } else if (response.status === 400) {
          if (response.data.errors) {
            const firstError = Object.values(response.data.errors)[0] as string[];
            setError(firstError?.[0] || 'Please check your input and try again.');
          } else {
            setError(response.data.message || 'Registration failed. Please check your input.');
          }
        } else {
          setError(response.data.message || 'An unexpected error occurred. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error during registration:', err);
      // Check if it's an Axios error with a response
      if (axios.isAxiosError(err) && err.response) {
        console.error('API Error Response:', err.response.data);
        // Handle specific status codes
        if (err.response.status === 409) {
          // Use the message from the backend response, or provide a default
          setError(err.response.data?.message || 'This email address is already registered.');
        } else if (err.response.status === 400) {
          // Handle validation errors (assuming backend sends errors object)
          const responseData = err.response.data;
          if (responseData?.errors) {
            // Display the first validation error message
            const firstErrorKey = Object.keys(responseData.errors)[0];
            const firstErrorMessage = responseData.errors[firstErrorKey]?.[0];
            setError(firstErrorMessage || 'Please check your input and try again.');
          } else {
            // Use backend message or a default for generic 400 errors
            setError(responseData?.message || 'Registration failed. Please check your input.');
          }
        } else {
          // Handle other API errors
          setError(err.response.data?.message || `An error occurred (Status: ${err.response.status}). Please try again.`);
        }
      } else {
        // Handle network errors or other non-API errors
        setError('Failed to connect to the server or an unexpected error occurred. Please check your network connection.');
      }
    } finally {
      // Always ensure loading is set to false after the try/catch/finally block
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Create Account - Step 1</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name (Username)</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password (min. 6 characters)</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Continue to Profile Setup'}
          </button>
        </form>

        <p className="auth-redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage; 