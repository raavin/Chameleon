/**
 * LoginScreen - Chameleon Protocol
 * 
 * Authentication screen supporting login and registration.
 * Uses the same Soft Pop aesthetic as the rest of the app.
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        // Validate registration
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        await register({ email, password, name });
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo/Brand */}
        <div style={styles.brand}>
          <span style={styles.emoji}>🦎</span>
          <h1 style={styles.title}>Chameleon Protocol</h1>
          <p style={styles.subtitle}>Sovereign Governance OS</p>
        </div>

        {/* Mode Toggle */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(mode === 'login' ? styles.activeTab : {})
            }}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            style={{
              ...styles.tab,
              ...(mode === 'register' ? styles.activeTab : {})
            }}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
          >
            {isLoading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={toggleMode} style={styles.link}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={toggleMode} style={styles.link}>
                Sign In
              </button>
            </>
          )}
        </p>

        {/* Offline Notice */}
        <p style={styles.offlineNote}>
          🔒 Your credentials are stored securely. Authentication works offline after initial login.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 20
  },
  card: {
    background: 'white',
    borderRadius: 24,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  brand: {
    textAlign: 'center',
    marginBottom: 24
  },
  emoji: {
    fontSize: 48,
    display: 'block',
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    margin: '4px 0 0 0'
  },
  tabContainer: {
    display: 'flex',
    background: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: '#666',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: 'white',
    color: '#667eea',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'transform 0.2s, opacity 0.2s'
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#666'
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
    textDecoration: 'underline'
  },
  offlineNote: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: '#9ca3af'
  }
};

export default LoginScreen;
