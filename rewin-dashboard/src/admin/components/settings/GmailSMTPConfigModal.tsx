// FEATURE: Gmail SMTP Configuration Modal
// FILE: GmailSMTPConfigModal.tsx
// PURPOSE: Simple Gmail SMTP setup for sending professional email templates
// LAST MODIFIED: January 28, 2025

import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import GmailSMTPService from '../../services/gmail-smtp.service';

interface GmailSMTPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

const GmailSMTPConfigModal: React.FC<GmailSMTPConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState({
    fromEmail: '',
    fromName: 'Rewin Admin Panel',
    appPassword: ''
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('rewin_gmail_smtp_config');
    
    if (savedConfig) {
      try {
        setConfig({ ...config, ...JSON.parse(savedConfig) });
      } catch (error) {
        console.error('Failed to load Gmail SMTP config:', error);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!config.fromEmail || !config.fromName || !config.appPassword) {
      alert('Please fill in all required fields');
      return;
    }

    // Save configuration
    localStorage.setItem('rewin_gmail_smtp_config', JSON.stringify(config));

    // Initialize Gmail SMTP service
    GmailSMTPService.initialize({
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      appPassword: config.appPassword
    });

    onSave(config);
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Initialize Gmail SMTP service
      GmailSMTPService.initialize({
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        appPassword: config.appPassword
      });

      // Test the service
      const result = await GmailSMTPService.testConfiguration();
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
        maxWidth: '600px',
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
              Gmail SMTP Setup
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

        {/* Setup Instructions */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
              textAlign: 'left'
            }}
          >
            <Info size={16} />
            {showInstructions ? 'Hide' : 'Show'} Gmail App Password Setup Instructions
          </button>
          
          {showInstructions && (
            <div style={{
              marginTop: '0.5rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              whiteSpace: 'pre-line'
            }}>
              {`Gmail App Password Setup (Simple & Secure):

✅ You already have your app password: evce trju prtv faxj

How to use it:
1. Enter your Gmail address below
2. Enter "evce trju prtv faxj" as your app password
3. Test the configuration
4. Save and start sending emails!

What is an App Password?
• A secure way to let apps access your Gmail
• More secure than using your regular password
• Works specifically for sending emails via SMTP
• Can be revoked anytime from your Google Account

Benefits:
✅ Simple setup - just Gmail + App Password
✅ Reliable delivery through Gmail's servers
✅ Beautiful HTML email templates
✅ Works immediately - no complex OAuth
✅ 500 emails per day (Gmail free limit)`}
            </div>
          )}
        </div>

        {/* Gmail Address */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Your Gmail Address *
          </label>
          <input
            type="email"
            value={config.fromEmail}
            onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
            placeholder="your-email@gmail.com"
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

        {/* From Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            From Name *
          </label>
          <input
            type="text"
            value={config.fromName}
            onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
            placeholder="Rewin Admin Panel"
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

        {/* App Password */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Gmail App Password *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={config.appPassword}
              onChange={(e) => setConfig({ ...config, appPassword: e.target.value })}
              placeholder="evce trju prtv faxj"
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '3rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{
            marginTop: '0.25rem',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.75rem'
          }}>
            Use the app password you generated: evce trju prtv faxj
          </div>
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
              ? 'Gmail SMTP configuration test passed! Ready to send emails.' 
              : `Test failed: ${testResult.error}`}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleTest}
            disabled={testing || !config.fromEmail || !config.appPassword}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '10px',
              color: '#3b82f6',
              fontSize: '0.875rem',
              cursor: testing || !config.fromEmail || !config.appPassword ? 'not-allowed' : 'pointer',
              opacity: testing || !config.fromEmail || !config.appPassword ? 0.5 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {testing ? 'Testing...' : 'Test Configuration'}
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 1.5rem',
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
      </div>
    </div>
  );
};

export default GmailSMTPConfigModal;
