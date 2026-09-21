import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

// Read stored session synchronously so the first paint already knows auth state
// (prevents the marketing page from flashing before redirect).
function readStoredSession() {
  try {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      return { token: storedToken, user: JSON.parse(storedUser) };
    }
  } catch {
    // Corrupted storage — fall through as logged out
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  // Synchronous initializer: no flash, ever.
  const [session, setSession] = useState(readStoredSession);
  const [loading, setLoading] = useState(false);

  const { token, user } = session;

  // Silent profile refresh: picks up server-side role/language changes
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi.me()
      .then((res) => {
        if (cancelled || !res.data?.user) return;
        const fresh = res.data.user;
        setSession((prev) => {
          const mergedUser = { ...(prev.user || {}), ...fresh };
          localStorage.setItem('user', JSON.stringify(mergedUser));
          if (!prev.user) return { token: prev.token, user: mergedUser };
          return { token: prev.token, user: mergedUser };
        });
      })
      .catch(() => {
        // 401s already redirect via the axios interceptor; ignore quietly
      });
    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback((authToken, userData) => {
    setSession({ token: authToken, user: userData });
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setSession({ token: null, user: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((patch) => {
    setSession((prev) => {
      const merged = { ...(prev.user || {}), ...patch };
      localStorage.setItem('user', JSON.stringify(merged));
      return { ...prev, user: merged };
    });
  }, []);

  const isAdmin = user?.role === 'admin' ||
    (user?.email && typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()).includes(user.email.toLowerCase()));

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
