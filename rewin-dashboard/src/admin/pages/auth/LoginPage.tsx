// FEATURE: Authentication
// FILE: LoginPage.tsx
// PURPOSE: Login page with admin/user toggle and Google Auth matching theme specifications
// ICONS USED: Mail, Lock, Eye, EyeOff (from approved ACTION_ICONS), GmailIcon (custom SVG component)
// LAST MODIFIED: January 28, 2025

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase.service';
import GmailIcon from '../../components/ui/GmailIcon';

type LoginType = 'admin' | 'user';

const LoginPage: React.FC = () => {
  // 1. STATE MANAGEMENT
  const [loginType, setLoginType] = useState<LoginType>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. HOOKS
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  // 3. HANDLERS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log('🔐 Starting login process. Type:', loginType, 'Email:', email);
      
      if (loginType === 'user') {
        // For user login, use simple Firebase auth like the original Rewin dashboard
        console.log('🔐 User login - using simple Firebase authentication');
        console.log('🔥 Firebase auth object:', auth);
        console.log('🔥 signInWithEmailAndPassword function:', signInWithEmailAndPassword);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ User authentication successful:', userCredential.user.email);
        
        // Redirect to user dashboard on same server
        console.log('🚀 Redirecting to user dashboard at /dashboard');
        
        console.log('✅ Authentication successful, redirecting to user dashboard...');
        console.log('🔑 User details:', {
          email: userCredential.user.email,
          uid: userCredential.user.uid,
          emailVerified: userCredential.user.emailVerified
        });
        
        // Navigate to user dashboard route
        console.log('🔄 Redirecting to user dashboard...');
        console.log('🔥 Current Firebase auth state:', auth.currentUser?.email);
        navigate('/dashboard');
      } else {
        // For admin login, use our custom authentication service
        console.log('🔐 Admin login - using custom authentication service');
        const result = await login(email, password, loginType);
        console.log('🔍 Admin login result:', result);
        
        if (result.success) {
          console.log('✅ Admin authentication successful:', result.user);
          navigate('/admin/dashboard');
        } else {
          console.error('❌ Admin login failed:', result.error);
          setError(result.error || 'Admin login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    
    try {
      if (loginType === 'user') {
        // For user login, use simple Firebase Google auth like the original Rewin dashboard
        console.log('🔐 User Google login - using simple Firebase authentication');
        
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('✅ User Google authentication successful:', result.user.email);
        
        // Redirect to user dashboard on same server
        console.log('🚀 Redirecting to user dashboard at /dashboard');
        navigate('/dashboard');
      } else {
        // For admin login, use our custom authentication service
        console.log('🔐 Admin Google login - using custom authentication service');
        const result = await loginWithGoogle(loginType);
        if (result.success) {
          console.log('✅ Admin Google authentication successful:', result.user);
          navigate('/admin/dashboard');
        } else {
          setError(result.error || 'Admin Google login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleToggleLoginType = (type: LoginType) => {
    setLoginType(type);
    // Clear form when switching
    setEmail('');
    setPassword('');
  };

  // 3. RENDER HELPERS
  const renderBrand = () => (
    <div className="auth-brand">
      <div className="brand-hero">
        <img 
          src="/ic_rewin_logo_new.png" 
          alt="Rewin logo" 
          className="brand-hero-logo" 
        />
      </div>
      <h1 className="brand-title">
        {loginType === 'admin' ? 'Rewin Admin Panel' : 'Rewin User Portal'}
      </h1>
      <p className="brand-subtitle">
        {loginType === 'admin' ? 'Secure management platform' : 'User dashboard access'}
      </p>
      <div className="brand-highlights">
        <div className="highlight">Secure Access</div>
        <div className="highlight">Real-time Data</div>
        <div className="highlight">Modern Interface</div>
      </div>
    </div>
  );

  const renderLoginToggle = () => (
    <div className="login-toggle">
      <button
        type="button"
        className={`toggle-option ${loginType === 'admin' ? 'active' : ''}`}
        onClick={() => handleToggleLoginType('admin')}
      >
        Admin Login
      </button>
      <button
        type="button"
        className={`toggle-option ${loginType === 'user' ? 'active' : ''}`}
        onClick={() => handleToggleLoginType('user')}
      >
        User Login
      </button>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email address</label>
        <div className="input-with-icon">
          <Mail size={16} />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder={loginType === 'admin' ? 'admin@company.com' : 'user@company.com'}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <div className="input-with-icon">
          <Lock size={16} />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="toggle-visibility"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading} 
        className="btn btn-primary btn-block"
      >
        {loading ? (
          <>
            <div className="spinner" style={{ width: '16px', height: '16px' }} />
            Signing in...
          </>
        ) : (
          `Sign in to ${loginType === 'admin' ? 'Admin Panel' : 'User Portal'}`
        )}
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <button 
        type="button" 
        onClick={handleGoogleLogin}
        disabled={loading} 
        className="btn btn-google btn-block"
      >
        <GmailIcon size={16} />
        Continue with Google
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      <button 
        type="button" 
        className="btn btn-secondary btn-block" 
        style={{ marginTop: '12px' }}
      >
        Reset Password
      </button>
    </form>
  );

  const renderDemoCredentials = () => (
    <div style={{
      marginTop: '18px',
      padding: '12px 14px',
      borderRadius: '12px',
      background: loginType === 'admin' 
        ? 'rgba(59, 130, 246, 0.08)' 
        : 'rgba(34, 197, 94, 0.08)',
      border: loginType === 'admin' 
        ? '1px solid rgba(59, 130, 246, 0.25)' 
        : '1px solid rgba(34, 197, 94, 0.25)',
      color: 'rgba(255, 255, 255, 0.9)'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: loginType === 'admin' ? '#bfdbfe' : '#bbf7d0',
        marginBottom: '6px'
      }}>
        Demo credentials
      </div>
      <div style={{ fontSize: '13px', display: 'grid', gap: '4px' }}>
        {loginType === 'admin' ? (
          <>
            <div><strong>Email:</strong> admin@rewin.com</div>
            <div><strong>Password:</strong> admin123</div>
          </>
        ) : (
          <>
            <div><strong>Email:</strong> user@rewin.com</div>
            <div><strong>Password:</strong> user123</div>
          </>
        )}
      </div>
    </div>
  );

  const renderAuthCard = () => (
    <div className="auth-card">
      <div className="auth-card-header">
        <h2>Sign in</h2>
        <p>
          {loginType === 'admin' 
            ? 'Use your admin credentials to access the control panel' 
            : 'Use your user credentials to access your dashboard'
          }
        </p>
      </div>

      {renderLoginToggle()}
      {renderForm()}
      {renderDemoCredentials()}

      <div style={{
        marginTop: '16px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        © 2025 Rewin {loginType === 'admin' ? 'Admin Panel' : 'User Portal'}
      </div>
    </div>
  );

  // 4. MAIN RENDER
  return (
    <div className="auth-layout">
      {renderAuthCard()}
      {renderBrand()}
    </div>
  );
};

export default LoginPage;
