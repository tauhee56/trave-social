import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../../config/firebase';

export type AuthUser = FirebaseUser | null;
const UserContext = createContext<AuthUser>(null);

interface UserProviderProps {
  children: ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={user}>{children}</UserContext.Provider>
  );
};

function useAuthUser() {
  return useContext(UserContext);
}

export { useAuthUser, UserContext, UserProvider };
export default UserContext;
