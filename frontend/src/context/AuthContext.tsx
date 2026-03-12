import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from '../lib/firebase';
import { identifyUser, resetUser } from '../lib/analytics';
import type { SimbaUser } from '../types';

interface AuthContextValue {
  user: SimbaUser | null;
  isLoggedIn: boolean;
  hasAccount: boolean;
  loading: boolean;
  needsPhone: boolean;
  loginWithGoogle: () => Promise<void>;
  updatePhone: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  markOnboarded: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimbaUser | null>(() => {
    try {
      const stored = localStorage.getItem('simba-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('simba-user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [hasAccount, setHasAccount] = useState(() =>
    !!localStorage.getItem('simba-has-account') || !!localStorage.getItem('simba-onboarded')
  );

  const needsPhone = phoneChecked && user?.provider === 'google' && !user?.phone;

  // Google Sign-In (popup with redirect fallback)
  const loginWithGoogle = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const provider = await getGoogleProvider();
    const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        localStorage.setItem('simba-auth-redirect', 'pending');
        await signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  }, []);

  // Save phone number to Firestore (for Google users)
  const updatePhone = useCallback(async (phone: string) => {
    if (!user || user.provider !== 'google') return;
    try {
      const db = await getFirebaseDb();
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', user.uid), { phone }, { merge: true });
      const updatedUser: SimbaUser = { ...user, phone };
      setUser(updatedUser);
      localStorage.setItem('simba-user', JSON.stringify(updatedUser));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Phone update failed:', error);
      throw error;
    }
  }, [user]);

  // Mark onboarded (so nav shows without auth)
  const markOnboarded = useCallback(() => {
    setHasAccount(true);
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    resetUser();
    setUser(null);
    localStorage.removeItem('simba-user');
  }, []);

  // Firebase auth state listener — loads Firebase lazily
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    getFirebaseAuth().then(async (auth) => {
      const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');

      // Handle redirect result (fallback from popup-blocked)
      getRedirectResult(auth)
        .then((result) => {
          if (result) localStorage.removeItem('simba-auth-redirect');
        })
        .catch((error: unknown) => {
          const code = (error as { code?: string })?.code;
          const message = (error as { message?: string })?.message;
          console.error('Redirect sign-in error:', code, message);
          localStorage.removeItem('simba-auth-redirect');
        });

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const { displayName, email, photoURL, uid } = firebaseUser;

          const baseUser: SimbaUser = {
            name: displayName || email || '',
            email: email || '',
            photoURL,
            uid,
            provider: 'google',
            phone: null,
          };
          setUser(baseUser);
          localStorage.setItem('simba-user', JSON.stringify(baseUser));
          localStorage.setItem('simba-has-account', 'true');
          setHasAccount(true);

          // Fetch phone from Firestore in background
          let phone: string | null = null;
          try {
            const db = await getFirebaseDb();
            const { doc, getDoc } = await import('firebase/firestore');
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              phone = (userDoc.data()?.phone as string) || null;
            }
          } catch (err) {
            if (import.meta.env.DEV) console.warn('Firestore read failed:', err);
          }

          const userData: SimbaUser = { ...baseUser, phone };
          setUser(userData);
          setPhoneChecked(true);
          try { identifyUser(userData); } catch { /* analytics non-critical */ }
          localStorage.setItem('simba-user', JSON.stringify(userData));
        } else {
          setUser(null);
          setPhoneChecked(false);
          localStorage.removeItem('simba-user');
        }
        setLoading(false);
      });
    }).catch(() => {
      // Firebase failed to init — still allow the app to work
      setLoading(false);
    });

    return () => { unsubscribe?.(); };
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
      markOnboarded,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
