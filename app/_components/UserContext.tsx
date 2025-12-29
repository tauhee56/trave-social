import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../../config/firebase';

export type AuthUser = FirebaseUser | null;
const UserContext = createContext<{ user: AuthUser; loading: boolean }>({ user: null, loading: true });

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      console.log('[UserContext] Auth state changed:', firebaseUser?.uid || 'no user');
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): FirebaseUser | null => {
  const context = useContext(UserContext);
  if (!context) {
    console.warn('[useUser] UserContext not found');
    return null;
  }
  if (!context.user && !context.loading) {
    console.warn('[useUser] User is not logged in');
  }
  return context.user;
};

export const useAuthLoading = (): boolean => {
  const context = useContext(UserContext);
  return context?.loading ?? true;
};
