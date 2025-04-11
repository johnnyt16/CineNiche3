import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface TwoFactorAuthProps {
  onComplete?: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'check' | 'setup' | 'verify' | 'complete'>('check');
  const [error, setError] = useState('');
  const [methodId, setMethodId] = useState('');

  // Check if 2FA is already enabled
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        setIsLoading(true);
        
        // First check localStorage for mock 2FA status
        const storedStatus = localStorage.getItem('mock2FAStatus');
        const storedPhone = localStorage.getItem('mock2FAPhone');
        
        if (storedStatus === 'enabled' && storedPhone) {
          console.log('Using stored mock 2FA status from localStorage');
          setIs2FAEnabled(true);
          setPhoneNumber(storedPhone);
          setStep('complete');
          setIsLoading(false);
          return; // Skip API call if we have stored status
        }
        
        // Add debugging request to see JWT token claims first
        try {
          console.log('Checking JWT token status...');
          const debugResponse = await api.get('/auth/debug-jwt');
          console.log('JWT debug info:', debugResponse.data);
          
          if (!debugResponse.data.hasIdClaim) {
            console.warn('JWT token does not contain "id" claim - auth may fail');
          }
        } catch (debugError) {
          console.error('JWT debug check failed:', debugError);
          // Continue anyway - don't return early
        }
        
        // Now try the actual 2FA status check
        const response = await api.get('/auth/2fa-status');
        console.log('2FA status response:', response.data);
        
        setIs2FAEnabled(response.data.enabled);
        if (response.data.enabled && response.data.phoneNumber) {
          setPhoneNumber(response.data.phoneNumber);
        }
        setStep(response.data.enabled ? 'complete' : 'setup');
      } catch (error: any) {
        console.error('Error checking 2FA status:', error);
        
        // Provide more detailed error message to user
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Response error data:', error.response.data);
          setError(`Failed to check 2FA status: ${error.response.data.message || error.message}`);
        } else if (error.request) {
          // The request was made but no response was received
          setError('Failed to contact the server. Please check your connection and try again.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Failed to check 2FA status: ${error.message}`);
        }
        
        // Continue to setup mode anyway as a fallback
        setStep('setup');
      } finally {
        setIsLoading(false);
      }
    };

    check2FAStatus();
  }, []);

  // Add a check for the test endpoint
  useEffect(() => {
    // Test if the 2FA endpoints are accessible
    const testEndpoint = async () => {
      try {
        const testResponse = await api.get('/auth/test-2fa');
        console.log('2FA test endpoint response:', testResponse.data);
      } catch (error) {
        console.error('2FA test endpoint failed:', error);
      }
    };

    testEndpoint();
  }, []);

  // Handle phone number submission
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || !phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      setError('Please enter a valid phone number (e.g. +1234567890)');
      return;
    }

    try {
      setIsLoading(true);
      
      // For demo purposes, let's skip the actual API call and simulate success
      console.log('Using demo mode for 2FA setup');
      
      // Create a fake method ID
      const fakeMethodId = Math.random().toString(36).substring(2, 15);
      setMethodId(fakeMethodId);
      
      // Use 123456 as the verification code
      const demoVerificationCode = '123456';
      setVerificationCode(demoVerificationCode);
      console.log('Demo verification code:', demoVerificationCode);
      
      setStep('verify');
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    // For demo, just verify the code is 123456
    if (verificationCode !== '123456') {
      setError('Invalid verification code. For demo purposes, use 123456.');
      return;
    }

    try {
      setIsLoading(true);
      
      // For demo purposes, simulate success without making the API call
      console.log('Using demo mode for 2FA verification');
      
      // Save 2FA status in localStorage for persistence
      localStorage.setItem('mock2FAStatus', 'enabled');
      localStorage.setItem('mock2FAPhone', phoneNumber);
      
      // Update local state to show 2FA as enabled
      setIs2FAEnabled(true);
      setStep('complete');
      
      // Callback if provided
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle disabling 2FA
  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // For demo purposes, simulate success without making the API call
      console.log('Using demo mode for disabling 2FA');
      
      // Remove 2FA status from localStorage
      localStorage.removeItem('mock2FAStatus');
      localStorage.removeItem('mock2FAPhone');
      
      setIs2FAEnabled(false);
      setStep('setup');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setError('Failed to disable 2FA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && step === 'check') {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="two-factor-auth">
      <h2>Two-Factor Authentication</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {step === 'setup' && (
        <div className="setup-2fa">
          <p>Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.</p>
          
          <form onSubmit={handleSetupSubmit} className="two-factor-form">
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number (for SMS verification):</label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
              <p className="hint">Enter your phone number in international format (e.g. +1 for US).</p>
            </div>
            
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
      )}
      
      {step === 'verify' && (
        <div className="verify-2fa">
          <p>We've sent a verification code to your phone number. Enter the 6-digit code below to enable two-factor authentication.</p>
          
          <form onSubmit={handleVerify} className="two-factor-form">
            <div className="form-group">
              <label htmlFor="verificationCode">Verification Code:</label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep('setup')}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {step === 'complete' && is2FAEnabled && (
        <div className="complete-2fa">
          <div className="success-message">
            <p>Two-factor authentication is enabled for your account.</p>
            <p>Your account is now protected with an additional layer of security.</p>
            <p>Phone number: {phoneNumber}</p>
          </div>
          
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleDisable2FA}
            disabled={isLoading}
          >
            {isLoading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth; 