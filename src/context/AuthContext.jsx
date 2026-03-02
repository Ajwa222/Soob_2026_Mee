import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('simba-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('simba-user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const hasAccount = !!localStorage.getItem('simba-has-account');
  const needsPhone = user?.provider === 'google' && !user?.phone;

  // Google Sign-In
  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  // Save phone number to Firestore (for Google users)
  const updatePhone = useCallback(async (phone) => {
    if (!user || user.provider !== 'google') return;
    await setDoc(doc(db, 'users', user.uid), { phone }, { merge: true });
    const updatedUser = { ...user, phone };
    setUser(updatedUser);
    localStorage.setItem('simba-user', JSON.stringify(updatedUser));
  }, [user]);

  // Logout
  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('simba-user');
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { displayName, email, photoURL, uid } = firebaseUser;

        // Fetch phone from Firestore
        let phone = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            phone = userDoc.data().phone || null;
          }
        } catch (err) { console.warn('Firestore read failed:', err); }

        const userData = {
          name: displayName || email,
          email,
          photoURL,
          uid,
          provider: 'google',
          phone,
        };
        setUser(userData);
        localStorage.setItem('simba-user', JSON.stringify(userData));
        localStorage.setItem('simba-has-account', 'true');
      } else {
        setUser(null);
        localStorage.removeItem('simba-user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      hasAccount,
      loading,
      needsPhone,
      loginWithGoogle,
      updatePhone,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
