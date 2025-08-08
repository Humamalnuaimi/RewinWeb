import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="brand-hero">
          <img src="/ic_rewin_logo_new.png" alt="Rewin logo" className="brand-hero-logo" />
        </div>
        <h1 className="brand-title">Rewin Admin Panel</h1>
        <p className="brand-subtitle">Admin access</p>
        <div className="brand-highlights">
          <div className="highlight">Secure by design</div>
          <div className="highlight">Real-time insights</div>
          <div className="highlight">Team-ready</div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <h2>Sign in</h2>
          <p>Use your admin credentials to continue</p>
        </div>

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
                placeholder="name@company.com"
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

          <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="demo-credentials">
          <div className="demo-title">Demo credentials</div>
          <div className="demo-list">
            <div><strong>Email:</strong> alnuaimi.humam@gmail.com</div>
            <div><strong>Password:</strong> admin123</div>
          </div>
        </div>

        <div className="auth-footer">© 2024 Rewin Admin Panel</div>
      </div>
    </div>
  );
};

export default LoginPage; 