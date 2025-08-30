// FEATURE: Gmail API Integration Modal
// FILE: GmailAPIIntegrationModal.tsx
// PURPOSE: Complete Gmail API setup with OAuth flow
// LAST MODIFIED: January 28, 2025

import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle, AlertCircle, ExternalLink, Key, Shield } from 'lucide-react';
import GmailBrowserAPIService from '../../services/gmail-browser-api.service';

interface GmailAPIIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

const GmailAPIIntegrationModal: React.FC<GmailAPIIntegrationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState<'credentials' | 'authorize' | 'complete'>('credentials');
  const [credentials, setCredentials] = useState({
    clientId: '285642633014-3vf9g0vt275bp7a83j24amlvlb1aqr.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: 'http://localhost:5173'
  });
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if already authorized
      const authorized = GmailAPIIntegrationService.isAuthorized();
      setIsAuthorized(authorized);
      
      if (authorized) {
        setStep('complete');
      } else {
        setStep('credentials');
      }
    }
  }, [isOpen]);

  const handleInitialize = () => {
    try {
      // Initialize Gmail API service
      GmailAPIIntegrationService.initialize(credentials);
      
      // Get authorization URL
      const url = GmailAPIIntegrationService.getAuthUrl();
      setAuthUrl(url);
      setStep('authorize');
      
    } catch (error: any) {
      alert(`Failed to initialize Gmail API: ${error.message}`);
    }
  };

  const handleAuthorize = async () => {
    if (!authCode.trim()) {
      alert('Please enter the authorization code');
      return;
    }

    try {
      setTesting(true);
      
      // Exchange code for tokens
      const tokens = await GmailAPIIntegrationService.getTokens(authCode.trim());
      
      console.log('✅ Gmail API authorized successfully');
      setIsAuthorized(true);
      setStep('complete');
      
      // Test connection
      const testResult = await GmailAPIIntegrationService.testConnection();
      setTestResult(testResult);
      
    } catch (error: any) {
      alert(`Authorization failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await GmailAPIIntegrationService.testConnection();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!isAuthorized) {
      alert('Please complete the authorization process first');
      return;
    }

    // Save configuration
    const config = {
      ...credentials,
      authorized: true,
      setupDate: new Date().toISOString()
    };
    
    localStorage.setItem('gmail_api_config', JSON.stringify(config));
    onSave(config);
    onClose();
  };

  const handleRevoke = () => {
    GmailAPIIntegrationService.clearTokens();
    localStorage.removeItem('gmail_api_config');
    setIsAuthorized(false);
    setStep('credentials');
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.95)',
        borderRadius: '20px',
        padding: '2rem',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.5rem',
              background: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} style={{ color: '#667eea' }} />
            </div>
            <h2 style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              Gmail API Integration
            </h2>
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          {['credentials', 'authorize', 'complete'].map((stepName, index) => (
            <div
              key={stepName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                background: step === stepName 
                  ? 'rgba(102, 126, 234, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${step === stepName 
                  ? '#667eea' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                color: step === stepName 
                  ? '#667eea' 
                  : 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: step === stepName ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              {stepName === 'credentials' && 'Setup'}
              {stepName === 'authorize' && 'Authorize'}
              {stepName === 'complete' && 'Complete'}
            </div>
          ))}
        </div>

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <div>
            <div style={{
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <Shield size={16} style={{ color: '#3b82f6' }} />
                <span style={{ color: '#3b82f6', fontWeight: '500' }}>OAuth Credentials Detected</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                margin: 0
              }}>
                Your OAuth credentials from Google Cloud Console have been pre-filled. Click "Initialize Gmail API" to continue.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Client ID
              </label>
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Client Secret
              </label>
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Redirect URI
              </label>
              <input
                type="text"
                value={credentials.redirectUri}
                onChange={(e) => setCredentials({ ...credentials, redirectUri: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleInitialize}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Initialize Gmail API
            </button>
          </div>
        )}

        {/* Step 2: Authorization */}
        {step === 'authorize' && (
          <div>
            <div style={{
              padding: '1rem',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <Key size={16} style={{ color: '#f59e0b' }} />
                <span style={{ color: '#f59e0b', fontWeight: '500' }}>Authorization Required</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                margin: 0
              }}>
                Click the link below to authorize Rewin to send emails via your Gmail account.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
              >
                <ExternalLink size={16} />
                Authorize Gmail Access
              </a>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Authorization Code
              </label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Paste the authorization code here"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleAuthorize}
              disabled={testing || !authCode.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: testing || !authCode.trim() 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: testing || !authCode.trim() ? 'not-allowed' : 'pointer',
                opacity: testing || !authCode.trim() ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {testing ? 'Authorizing...' : 'Complete Authorization'}
            </button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div>
            <div style={{
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <CheckCircle size={32} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
              <div style={{
                color: '#10b981',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Gmail API Successfully Configured!
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                margin: 0
              }}>
                Your admin panel can now send automatic invitation emails via Gmail.
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <div style={{
                padding: '0.75rem',
                background: testResult.success 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${testResult.success 
                  ? 'rgba(16, 185, 129, 0.3)' 
                  : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '8px',
                color: testResult.success ? '#10b981' : '#ef4444',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {testResult.success 
                  ? 'Gmail API connection test passed!' 
                  : `Connection test failed: ${testResult.error}`}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  color: '#3b82f6',
                  fontSize: '0.875rem',
                  cursor: testing ? 'not-allowed' : 'pointer',
                  opacity: testing ? 0.5 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                onClick={handleRevoke}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Revoke Access
              </button>
            </div>

            <button
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailAPIIntegrationModal;
