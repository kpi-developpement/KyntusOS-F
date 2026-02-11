"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'PILOT';
  manualPoints?: number;
  errorCount?: number;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 1. Initialisation
  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem('kyntus_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Erreur parsing user data", e);
          localStorage.removeItem('kyntus_user');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // 2. Login Action (STATE ONLY)
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('kyntus_user', JSON.stringify(userData));
    // ❌ Zewwelna redirection mn hna. L page hya li ghat-tkellef.
  };

  // 3. Logout Action
  const logout = () => {
    setUser(null);
    localStorage.removeItem('kyntus_user');
    router.push('/login'); 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}