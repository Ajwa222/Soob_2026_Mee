import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('simba-user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const hasAccount = !!localStorage.getItem('simba-has-account');
  const needsPhone = user?.provider === 'google' && !user?.phone;

  // Manual login (backward compatible)
  const login = useCallback((name, phone) => {
    const userData = { name: name || phone, phone, provider: 'manual' };
    setUser(userData);
    localStorage.setItem('simba-user', JSON.stringify(userData));
    localStorage.setItem('simba-has-account', 'true');
  }, []);

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

  // Logout (Firebase + localStorage)
  const logout = useCallback(async () => {
    try { await signOut(auth); } catch (_) { /* manual-only user */ }
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
        } catch (_) { /* Firestore read failed — phone stays null */ }

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
        // No Firebase user — fall back to manual login if present
        const stored = localStorage.getItem('simba-user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.provider === 'manual') {
            setUser(parsed);
          } else {
            setUser(null);
            localStorage.removeItem('simba-user');
          }
        }
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
      login,
      loginWithGoogle,
      updatePhone,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
