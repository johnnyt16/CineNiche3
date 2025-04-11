import React, { useState, useEffect } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';

export interface CookieSettings {
  necessary: boolean; // Always true, can't be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

// Default settings where only necessary cookies are enabled
const defaultSettings: CookieSettings = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookieConsent: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<CookieSettings>(defaultSettings);
  const { cookieSettings, hasConsent, setConsent } = useCookieConsent();

  // Update temp settings when cookie settings change
  useEffect(() => {
    setTempSettings(cookieSettings);
  }, [cookieSettings]);

  // Handle "Accept All" action
  const handleAcceptAll = () => {
    const acceptedSettings: CookieSettings = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    
    setConsent(acceptedSettings);
  };

  // Handle "Accept Necessary Only" action
  const handleAcceptNecessary = () => {
    setConsent(defaultSettings);
  };

  // Handle save settings
  const handleSaveSettings = () => {
    setConsent(tempSettings);
    setShowSettings(false);
  };

  // Toggle individual settings
  const handleSettingChange = (settingName: keyof CookieSettings) => {
    if (settingName === 'necessary') return; // Can't toggle necessary cookies
    
    setTempSettings((prev) => ({
      ...prev,
      [settingName]: !prev[settingName],
    }));
  };

  // Don't show if consent has already been given
  if (hasConsent) return null;

  return (
    <div className="cookie-consent">
      {!showSettings ? (
        <div className="cookie-banner">
          <div className="cookie-content">
            <h3>Cookie Consent</h3>
            <p>
              We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. For more information, please read our <a href="/privacy-policy">Privacy Policy</a>.
            </p>
            <div className="cookie-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowSettings(true)}
              >
                Customize Settings
              </button>
              <button 
                className="btn-secondary"
                onClick={handleAcceptNecessary}
              >
                Accept Necessary Only
              </button>
              <button 
                className="btn-primary"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cookie-settings">
          <div className="cookie-settings-content">
            <h3>Cookie Settings</h3>
            <div className="cookie-setting-item">
              <div className="cookie-setting-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={tempSettings.necessary}
                    disabled={true} 
                  />
                  <span>Necessary Cookies</span>
                </label>
              </div>
              <p>These cookies are required for the website to function and cannot be disabled.</p>
            </div>
            
            <div className="cookie-setting-item">
              <div className="cookie-setting-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={tempSettings.functional}
                    onChange={() => handleSettingChange('functional')} 
                  />
                  <span>Functional Cookies</span>
                </label>
              </div>
              <p>These cookies enable personalized features and functionality.</p>
            </div>
            
            <div className="cookie-setting-item">
              <div className="cookie-setting-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={tempSettings.analytics}
                    onChange={() => handleSettingChange('analytics')} 
                  />
                  <span>Analytics Cookies</span>
                </label>
              </div>
              <p>These cookies help us understand how visitors interact with our website.</p>
            </div>
            
            <div className="cookie-setting-item">
              <div className="cookie-setting-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={tempSettings.marketing}
                    onChange={() => handleSettingChange('marketing')} 
                  />
                  <span>Marketing Cookies</span>
                </label>
              </div>
              <p>These cookies are used to track visitors across websites to display relevant advertisements.</p>
            </div>
            
            <div className="cookie-settings-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieConsent; 