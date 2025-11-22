// FEATURE: Authentication Hook
// FILE: useAuth.ts
// PURPOSE: React hook for authentication state management
// LAST MODIFIED: January 28, 2025

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth, AuthService } from '../services/firebase.service';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string, loginType?: 'admin' | 'user') => Promise<any>;
  loginWithGoogle: (loginType?: 'admin' | 'user') => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (!user) {
        // Attempt to complete Google redirect sign-in
        const redirectResult = await AuthService.handleGoogleRedirect('admin').catch(() => null);
        if (redirectResult?.success && redirectResult.user) {
          setUser(redirectResult.user as any);
          setIsAdmin(redirectResult.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, loginType: 'admin' | 'user' = 'admin') => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithEmail(email, password, loginType);
      if (result.success) {
        setIsAdmin(result.isAdmin || false);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (loginType: 'admin' | 'user' = 'admin') => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle(loginType);
      if (result.success) {
        setIsAdmin(result.isAdmin || false);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signOut();
      setUser(null);
      setIsAdmin(false);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAdmin,
    loading,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
