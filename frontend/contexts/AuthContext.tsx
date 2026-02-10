/**
 * AuthContext - Chameleon Protocol
 * 
 * Provides authentication state and methods across the app.
 * Session-based auth via server cookies.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'SUPERVISOR' | 'WORKER';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'chameleon_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch current user from server
   */
  const checkAuth = useCallback(async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  /**
   * Initialize auth from server session
   */
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  /**
   * Register new user
   */
  const register = async (registerData: RegisterData) => {
    const data = await authApi.register(registerData);
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  /**
   * Logout user
   */
  const logout = () => {
    authApi.logout().catch(() => undefined);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
