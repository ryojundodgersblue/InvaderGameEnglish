import React, { createContext, useContext, useState, useCallback } from 'react';

// localStorage keys
const STORAGE_KEYS = {
  userId: 'userId',
  userName: 'userName',
  isAdmin: 'is_admin',
  currentGrade: 'current_grade',
  currentPart: 'current_part',
  currentSubpart: 'current_subpart',
} as const;

export interface UserSession {
  userId: string;
  userName: string;
  isAdmin: boolean;
  currentGrade: string;
  currentPart: string;
  currentSubpart: string;
}

interface AuthContextType {
  session: UserSession | null;
  login: (user: {
    userId: string;
    name: string;
    current_grade: number;
    current_part: number;
    is_admin: boolean;
  }) => void;
  logout: () => void;
  updateProgress: (grade: string | number, part: string | number, subpart: string | number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadSession(): UserSession | null {
  const userId = localStorage.getItem(STORAGE_KEYS.userId);
  if (!userId) return null;
  return {
    userId,
    userName: localStorage.getItem(STORAGE_KEYS.userName) || '',
    isAdmin: localStorage.getItem(STORAGE_KEYS.isAdmin) === 'true',
    currentGrade: localStorage.getItem(STORAGE_KEYS.currentGrade) || '1',
    currentPart: localStorage.getItem(STORAGE_KEYS.currentPart) || '1',
    currentSubpart: localStorage.getItem(STORAGE_KEYS.currentSubpart) || '1',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(loadSession);

  const login = useCallback((user: {
    userId: string;
    name: string;
    current_grade: number;
    current_part: number;
    is_admin: boolean;
  }) => {
    const newSession: UserSession = {
      userId: user.userId,
      userName: user.name,
      isAdmin: user.is_admin,
      currentGrade: String(user.current_grade ?? '1'),
      currentPart: String(user.current_part ?? '1'),
      currentSubpart: '1',
    };

    localStorage.setItem(STORAGE_KEYS.userId, newSession.userId);
    localStorage.setItem(STORAGE_KEYS.userName, newSession.userName);
    localStorage.setItem(STORAGE_KEYS.isAdmin, String(newSession.isAdmin));
    localStorage.setItem(STORAGE_KEYS.currentGrade, newSession.currentGrade);
    localStorage.setItem(STORAGE_KEYS.currentPart, newSession.currentPart);
    localStorage.setItem(STORAGE_KEYS.currentSubpart, newSession.currentSubpart);

    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setSession(null);
  }, []);

  const updateProgress = useCallback((grade: string | number, part: string | number, subpart: string | number) => {
    const g = String(grade);
    const p = String(part);
    const s = String(subpart);

    localStorage.setItem(STORAGE_KEYS.currentGrade, g);
    localStorage.setItem(STORAGE_KEYS.currentPart, p);
    localStorage.setItem(STORAGE_KEYS.currentSubpart, s);

    setSession(prev => prev ? { ...prev, currentGrade: g, currentPart: p, currentSubpart: s } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, updateProgress }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
