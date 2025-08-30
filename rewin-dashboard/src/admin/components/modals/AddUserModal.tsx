// FEATURE: Add User Modal
// FILE: AddUserModal.tsx
// PURPOSE: Modal for adding new users with email/Gmail invitation options
// LAST MODIFIED: January 28, 2025

import React, { useState } from 'react';
import { X, Mail, UserPlus, Send } from 'lucide-react';
import GmailIcon from '../ui/GmailIcon';

export interface AddUserData {
  email: string;
  displayName: string;
  invitationType: 'email' | 'gmail';
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (userData: AddUserData) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    invitationType: 'email' as 'email' | 'gmail'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.displayName) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddUser(formData);
      // Reset form and close modal on success
      setFormData({ email: '', displayName: '', invitationType: 'email' });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ email: '', displayName: '', invitationType: 'email' });
      setError('');
      onClose();
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
        maxWidth: '500px',
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
              <UserPlus size={20} style={{ color: '#667eea' }} />
            </div>
            <h2 style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              Add New User
            </h2>
          </div>
          
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {/* Display Name Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="John Doe"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {/* Invitation Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Invitation Method
            </label>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Email Invitation */}
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: formData.invitationType === 'email' 
                  ? 'rgba(102, 126, 234, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${formData.invitationType === 'email' 
                  ? '#667eea' 
                  : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="radio"
                  name="invitationType"
                  value="email"
                  checked={formData.invitationType === 'email'}
                  onChange={(e) => setFormData({ ...formData, invitationType: e.target.value as 'email' | 'gmail' })}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <Mail size={20} style={{ 
                  color: formData.invitationType === 'email' ? '#667eea' : 'rgba(255, 255, 255, 0.5)' 
                }} />
                <div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Email Invitation
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    Send password setup link
                  </div>
                </div>
              </label>

              {/* Gmail Invitation */}
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: formData.invitationType === 'gmail' 
                  ? 'rgba(102, 126, 234, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${formData.invitationType === 'gmail' 
                  ? '#667eea' 
                  : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="radio"
                  name="invitationType"
                  value="gmail"
                  checked={formData.invitationType === 'gmail'}
                  onChange={(e) => setFormData({ ...formData, invitationType: e.target.value as 'email' | 'gmail' })}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <GmailIcon size={20} />
                <div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Gmail Invitation
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    Google OAuth signup
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || !formData.email || !formData.displayName}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading || !formData.email || !formData.displayName
                  ? 'rgba(102, 126, 234, 0.3)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading || !formData.email || !formData.displayName ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Add spinning animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AddUserModal;
export type { AddUserData };
