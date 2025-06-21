'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from 'firebase/auth';

// A mock user object for demonstration purposes.
const mockUser = {
  uid: 'mock-user-123',
  email: 'test@dialogue.case',
  displayName: 'Test User',
  photoURL: null,
  // The rest of the properties are to satisfy the 'User' type from firebase/auth
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'mock',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token' } as any),
  reload: async () => {},
  toJSON: () => ({}),
} as User;


type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true, // Start in a loading state to prevent race conditions
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start in a loading state

  // This effect simulates checking for an existing session on app load.
  // In a real app, this would be an async call to your auth backend.
  useEffect(() => {
    // For this mock provider, we'll just finish "loading" after a moment.
    // This gives the rest of the app time to mount before routing logic runs.
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200); // A short delay is enough to prevent race conditions

    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(() => {
    setUser(mockUser);
  }, []);
  
  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
