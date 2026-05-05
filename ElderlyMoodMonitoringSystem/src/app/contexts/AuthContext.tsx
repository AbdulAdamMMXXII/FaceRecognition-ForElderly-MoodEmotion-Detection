// src/app/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../firebase';
import { getUserProfile, subscribeToUserProfile } from '../services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubRef = React.useRef<null | (() => void)>(null);

  const applyPreferences = (prefs: any) => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;

    if (prefs?.theme === 'dark') {
      html.classList.add('dark');
    } else if (prefs?.theme === 'light') {
      html.classList.remove('dark');
    } else {
      html.classList.remove('dark');
    }

    if (prefs?.largeText) html.classList.add('large-text');
    else html.classList.remove('large-text');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setUser(firebaseUser);
      // if a user just signed in, ensure a minimal profile document exists
      (async () => {
        try {
          if (!firebaseUser) {
            applyPreferences({ theme: 'light', largeText: false });
            return;
          }

          const existing = await getUserProfile(firebaseUser.uid);
          applyPreferences((existing as any)?.preferences || { theme: 'light', largeText: false });

          const unsubProfile = subscribeToUserProfile(firebaseUser.uid, (p) => {
            try {
              const prefs = (p as any)?.preferences || {};
              applyPreferences(prefs);
            } catch (e) {
              console.warn('applyPreferences failed', e);
            }
          });

          profileUnsubRef.current = unsubProfile;
        } catch (err) {
          console.warn('Failed to ensure user profile exists:', err);
        } finally {
          setLoading(false);
        }
      })();
    });
    return () => {
      try {
        if (profileUnsubRef.current) {
          profileUnsubRef.current();
          profileUnsubRef.current = null;
        }
      } catch (e) {}
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
