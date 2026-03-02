import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
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
  const [hasAccount, setHasAccount] = useState(() =>
    !!localStorage.getItem('simba-has-account') || !!localStorage.getItem('simba-onboarded')
  );

  const needsPhone = user?.provider === 'google' && !user?.phone;

  // Google Sign-In (popup with redirect fallback)
  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        localStorage.setItem('simba-auth-redirect', 'pending');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  }, []);

  // Save phone number to Firestore (for Google users)
  const updatePhone = useCallback(async (phone: string) => {
    if (!user || user.provider !== 'google') return;
    try {
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
    await signOut(auth);
    resetUser();
    setUser(null);
    localStorage.removeItem('simba-user');
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    // Handle redirect result (fallback from popup-blocked)
    getRedirectResult(auth).catch((error: unknown) => {
      if (import.meta.env.DEV && (error as { code?: string })?.code) {
        const e = error as { code: string; message: string };
        console.error('Redirect sign-in error:', e.code, e.message);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { displayName, email, photoURL, uid } = firebaseUser;

        // Set user immediately so UI updates without waiting for Firestore
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
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            phone = (userDoc.data().phone as string) || null;
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Firestore read failed:', err);
        }

        const userData: SimbaUser = { ...baseUser, phone };
        setUser(userData);
        try { identifyUser(userData); } catch { /* analytics non-critical */ }
        localStorage.setItem('simba-user', JSON.stringify(userData));
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
