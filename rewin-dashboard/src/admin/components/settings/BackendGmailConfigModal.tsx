// FEATURE: Backend Gmail Configuration Modal
// FILE: BackendGmailConfigModal.tsx
// PURPOSE: Modal for configuring backend Gmail API service
// LAST MODIFIED: January 28, 2025

import React, { useState, useEffect } from 'react';
import { X, Settings, ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import BackendEmailService, { BackendEmailConfig } from '../../services/backend-email.service';

interface BackendGmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BackendEmailConfig) => void;
}

const BackendGmailConfigModal: React.FC<BackendGmailConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<BackendEmailConfig>({
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3001/auth/callback',
    fromEmail: '',
    fromName: 'Rewin Admin Panel',
  });

  const [step, setStep] = useState(1); // 1: Server Check, 2: Credentials, 3: Authorization, 4: Complete
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  
  // Loading and status states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<{ running: boolean; configured: boolean } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load saved configuration on mount
  useEffect(() => {
    if (isOpen) {
      checkServerHealth();
      loadSavedConfig();
    }
  }, [isOpen]);

  const loadSavedConfig = () => {
    try {
      const savedConfig = localStorage.getItem('backend_gmail_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
    }
  };

  const saveConfig = (configToSave: BackendEmailConfig) => {
    try {
      localStorage.setItem('backend_gmail_config', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const checkServerHealth = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await BackendEmailService.checkServerHealth();
      
      if (result.success) {
        setServerStatus({
          running: true,
          configured: result.configured || false
        });
        
        if (result.configured) {
          setStep(4); // Skip to complete if already configured
        } else {
          setStep(2); // Go to credentials step
        }
      } else {
        setServerStatus({ running: false, configured: false });
        setError(result.error || 'Backend server not running');
      }
    } catch (error: any) {
      setServerStatus({ running: false, configured: false });
      setError('Failed to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAuthUrl = async () => {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await BackendEmailService.getAuthUrl(config);
      
      if (result.success && result.authUrl) {
        setAuthUrl(result.authUrl);
        setStep(3);
      } else {
        setError(result.error || 'Failed to get authorization URL');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to get authorization URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExchangeToken = async () => {
    if (!authCode.trim()) {
      setError('Please enter the authorization code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Exchange code for tokens
      const tokenResult = await BackendEmailService.exchangeToken(config, authCode.trim());
      
      if (!tokenResult.success) {
        setError(tokenResult.error || 'Failed to exchange authorization code');
        return;
      }

      // Configure backend with tokens
      const configWithToken: BackendEmailConfig = {
        ...config,
        refreshToken: tokenResult.tokens.refreshToken
      };

      const configResult = await BackendEmailService.configure(configWithToken);
      
      if (configResult.success) {
        setConfig(configWithToken);
        saveConfig(configWithToken);
        setStep(4);
        setTestResult({ success: true, message: 'Gmail API configured successfully!' });
      } else {
        setError(configResult.error || 'Failed to configure Gmail API');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to complete authorization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError('');
    setTestResult(null);

    try {
      const result = await BackendEmailService.testConnection();
      
      if (result.success) {
        setTestResult({ success: true, message: 'Connection test successful!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection test failed' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem('backend_gmail_config');
    BackendEmailService.clearConfig();
    setConfig({
      clientId: '',
      clientSecret: '',
      redirectUri: 'http://localhost:3001/auth/callback',
      fromEmail: '',
      fromName: 'Rewin Admin Panel',
    });
    setStep(1);
    setAuthCode('');
    setAuthUrl('');
    setTestResult(null);
    setError('');
    checkServerHealth();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '20px',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={24} color="rgba(255, 255, 255, 0.9)" />
            <h2 style={{
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              Backend Gmail API Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          {[1, 2, 3, 4].map((stepNum) => (
            <React.Fragment key={stepNum}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: step >= stepNum ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {step > stepNum ? <CheckCircle size={16} /> : stepNum}
              </div>
              {stepNum < 4 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: step > stepNum ? '#10b981' : 'rgba(255, 255, 255, 0.2)'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
          marginBottom: '2rem',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <div>Server Check</div>
          <div>Credentials</div>
          <div>Authorization</div>
          <div>Complete</div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {/* Step 1: Server Check */}
        {step === 1 && (
          <div>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
              Checking Backend Server
            </h3>
            
            {isLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <Loader className="animate-spin" size={16} />
                Checking server status...
              </div>
            ) : serverStatus ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {serverStatus.running ? (
                    <CheckCircle size={16} color="#10b981" />
                  ) : (
                    <AlertCircle size={16} color="#ef4444" />
                  )}
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Server Status: {serverStatus.running ? 'Running' : 'Not Running'}
                  </span>
                </div>
                
                {!serverStatus.running && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ color: '#ef4444', margin: 0, fontSize: '0.875rem' }}>
                      Backend server is not running. Please start the server first:
                    </p>
                    <code style={{
                      display: 'block',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.75rem'
                    }}>
                      cd backend && npm start
                    </code>
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={checkServerHealth}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Checking...' : 'Retry Check'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
              Gmail API Credentials
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  Client ID *
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="Your Google OAuth Client ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  Client Secret *
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Your Google OAuth Client Secret"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  From Email *
                </label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="your-email@gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  From Name
                </label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                  placeholder="Rewin Admin Panel"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={handleGetAuthUrl}
                disabled={isLoading || !config.clientId || !config.clientSecret || !config.fromEmail}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: (isLoading || !config.clientId || !config.clientSecret || !config.fromEmail) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: (isLoading || !config.clientId || !config.clientSecret || !config.fromEmail) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Processing...' : 'Next: Get Authorization'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Authorization */}
        {step === 3 && (
          <div>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
              Google Authorization
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                1. Click the button below to open Google's authorization page
              </p>
              
              <button
                onClick={() => window.open(authUrl, '_blank')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem'
                }}
              >
                <ExternalLink size={16} />
                Open Google Authorization
              </button>
              
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                2. After authorizing, copy the authorization code and paste it below:
              </p>
              
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  Authorization Code *
                </label>
                <textarea
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste the authorization code here..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Back
              </button>
              <button
                onClick={handleExchangeToken}
                disabled={isLoading || !authCode.trim()}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: (isLoading || !authCode.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: (isLoading || !authCode.trim()) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Authorizing...' : 'Complete Authorization'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
              Setup Complete!
            </h3>
            
            {testResult && (
              <div style={{
                background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {testResult.success ? (
                  <CheckCircle size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#ef4444" />
                )}
                <span style={{
                  color: testResult.success ? '#10b981' : '#ef4444',
                  fontSize: '0.875rem'
                }}>
                  {testResult.message}
                </span>
              </div>
            )}

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#10b981', margin: 0, fontSize: '0.875rem' }}>
                ✅ Gmail API has been configured successfully! The backend server can now send emails automatically.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Reset Setup
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Save & Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackendGmailConfigModal;
