import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, appId } from '@/lib/firebase';

export interface User {
  userId: string;
  name: string;
  company: string;
  role: string;
  rank: string;
  approved: boolean;
  joinDate?: string;
  password?: string;
  lastReadNotice?: number;
  isResigned?: boolean;
  resignDate?: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (user: User, autoLogin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
        const saved = localStorage.getItem('sas_user_session') || sessionStorage.getItem('sas_user_session');
        if (saved) {
          const user = JSON.parse(saved);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser?.userId) {
      const unsubscribe = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.userId), (doc) => {
        if (doc.exists()) {
          setCurrentUser(doc.data() as User);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('sas_user_session');
          sessionStorage.removeItem('sas_user_session');
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser?.userId]);

  const login = (user: User, autoLogin: boolean) => {
    if (autoLogin) {
      localStorage.setItem('sas_user_session', JSON.stringify(user));
    } else {
      sessionStorage.setItem('sas_user_session', JSON.stringify(user));
    }
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('sas_user_session');
    sessionStorage.removeItem('sas_user_session');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
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
