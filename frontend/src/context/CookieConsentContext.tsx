import React, { createContext, useContext, useState, useEffect } from 'react';
import { CookieSettings } from '../components/CookieConsent';

interface CookieConsentContextProps {
  cookieSettings: CookieSettings;
  hasConsent: boolean;
  setConsent: (settings: CookieSettings) => void;
  resetConsent: () => void;
  isCookieAllowed: (type: keyof CookieSettings) => boolean;
}

// Default settings
const defaultSettings: CookieSettings = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext<CookieConsentContextProps>({
  cookieSettings: defaultSettings,
  hasConsent: false,
  setConsent: () => {},
  resetConsent: () => {},
  isCookieAllowed: () => false,
});

export const useCookieConsent = () => useContext(CookieConsentContext);

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cookieSettings, setCookieSettings] = useState<CookieSettings>(defaultSettings);
  const [hasConsent, setHasConsent] = useState(false);

  // Load previously saved cookie consent on mount
  useEffect(() => {
    const consentGiven = localStorage.getItem('cookieConsentGiven');
    const savedSettings = localStorage.getItem('cookieSettings');

    if (consentGiven === 'true' && savedSettings) {
      try {
        setCookieSettings(JSON.parse(savedSettings));
        setHasConsent(true);
      } catch (error) {
        console.error('Error parsing saved cookie settings:', error);
      }
    }
  }, []);

  // Save cookie consent settings
  const setConsent = (settings: CookieSettings) => {
    localStorage.setItem('cookieConsentGiven', 'true');
    localStorage.setItem('cookieSettings', JSON.stringify(settings));
    setCookieSettings(settings);
    setHasConsent(true);
  };

  // Reset cookie consent (for testing or when user wants to clear settings)
  const resetConsent = () => {
    localStorage.removeItem('cookieConsentGiven');
    localStorage.removeItem('cookieSettings');
    setCookieSettings(defaultSettings);
    setHasConsent(false);
  };

  // Check if a specific cookie type is allowed
  const isCookieAllowed = (type: keyof CookieSettings) => {
    // Necessary cookies are always allowed
    if (type === 'necessary') return true;
    
    // Other types require consent and specific type to be enabled
    return hasConsent && cookieSettings[type];
  };

  return (
    <CookieConsentContext.Provider 
      value={{ 
        cookieSettings, 
        hasConsent, 
        setConsent, 
        resetConsent,
        isCookieAllowed 
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};

export default CookieConsentProvider; 