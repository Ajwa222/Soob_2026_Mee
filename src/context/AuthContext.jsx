import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { identifyUser, resetUser } from '../lib/analytics';

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

  // Google Sign-In (popup with redirect fallback)
  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        localStorage.setItem('simba-auth-redirect', 'pending');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
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
    resetUser();
    setUser(null);
    localStorage.removeItem('simba-user');
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    // Handle redirect result (fallback from popup-blocked)
    getRedirectResult(auth).catch((error) => {
      if (error?.code) {
        console.error('Redirect sign-in error:', error.code, error.message);
      }
    });

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
        identifyUser(userData);
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
