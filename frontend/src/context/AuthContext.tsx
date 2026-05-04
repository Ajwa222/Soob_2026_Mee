/**
 * Authentication context — manages Google Sign-In state for the entire app.
 *
 * Responsibilities:
 *  - Provides the current SOOBUser (or null) to all descendants via useAuth()
 *  - Handles Google Sign-In (popup with redirect fallback for popup-blocked)
 *  - Listens to Firebase onAuthStateChanged to keep state in sync
 *  - Fetches the user's phone number from Firestore after sign-in
 *  - Persists user data in localStorage for instant hydration on reload
 *  - Identifies the user in analytics (Mixpanel / Clarity) on sign-in and resets on sign-out
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from '../lib/firebase';
import { identifyUser, resetUser } from '../lib/analytics';
import type { SOOBUser } from '../types';

/** Shape of the value exposed by AuthContext.Provider */
interface AuthContextValue {
  user: SOOBUser | null;          // Current user, or null if not signed in
  isLoggedIn: boolean;             // Convenience boolean derived from user
  hasAccount: boolean;             // True if user has ever signed in (persisted across sessions)
  loading: boolean;                // True while Firebase auth state is being resolved
  needsPhone: boolean;             // True if Google user hasn't provided a phone number yet
  loginWithGoogle: () => Promise<void>;
  loginWithOtp: (kind: 'phone' | 'email', value: string, name?: string) => Promise<void>;
  updatePhone: (phone: string) => Promise<void>;
  updateProfile: (updates: { name?: string; email?: string; phone?: string | null; photoURL?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  markOnboarded: () => void;       // Marks the user as onboarded (skips onboarding modal)
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate user from localStorage for instant rendering before Firebase resolves
  const [user, setUser] = useState<SOOBUser | null>(() => {
    try {
      const stored = localStorage.getItem('soob-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('soob-user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [hasAccount, setHasAccount] = useState(() =>
    !!localStorage.getItem('soob-has-account') || !!localStorage.getItem('soob-onboarded')
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
        localStorage.setItem('soob-auth-redirect', 'pending');
        await signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  }, []);

  // OTP sign-in (mocked — when a real OTP backend lands, replace this body
  // with a Firebase phone-auth or custom token flow).
  const loginWithOtp = useCallback(async (
    kind: 'phone' | 'email',
    value: string,
    name?: string,
  ) => {
    const otpUser: SOOBUser = {
      name: name?.trim() || (kind === 'email' ? value.split('@')[0] : 'SOOB user'),
      email: kind === 'email' ? value : '',
      photoURL: null,
      uid: `otp-${kind}-${value}`,
      provider: 'otp',
      phone: kind === 'phone' ? value : null,
    };
    setUser(otpUser);
    localStorage.setItem('soob-user', JSON.stringify(otpUser));
    localStorage.setItem('soob-has-account', 'true');
    setHasAccount(true);
    identifyUser(otpUser.uid, { provider: 'otp', name: otpUser.name });
  }, []);

  // Save phone number to Firestore (for Google users)
  const updatePhone = useCallback(async (phone: string) => {
    if (!user || user.provider !== 'google') return;
    try {
      const db = await getFirebaseDb();
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', user.uid), { phone }, { merge: true });
      const updatedUser: SOOBUser = { ...user, phone };
      setUser(updatedUser);
      localStorage.setItem('soob-user', JSON.stringify(updatedUser));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Phone update failed:', error);
      throw error;
    }
  }, [user]);

  // Update profile fields (name / email / phone). Persists locally for all
  // providers; for Google users also persists email + phone to Firestore.
  const updateProfile = useCallback(async (updates: { name?: string; email?: string; phone?: string | null; photoURL?: string | null }) => {
    if (!user) return;
    const merged: SOOBUser = {
      ...user,
      name: updates.name !== undefined ? updates.name : user.name,
      email: updates.email !== undefined ? updates.email : user.email,
      phone: updates.phone !== undefined ? updates.phone : user.phone,
      photoURL: updates.photoURL !== undefined ? updates.photoURL : user.photoURL,
    };
    setUser(merged);
    localStorage.setItem('soob-user', JSON.stringify(merged));
    if (user.provider === 'google') {
      try {
        const db = await getFirebaseDb();
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(
          doc(db, 'users', user.uid),
          { name: merged.name, email: merged.email, phone: merged.phone ?? null, photoURL: merged.photoURL ?? null },
          { merge: true },
        );
      } catch (error) {
        if (import.meta.env.DEV) console.error('Profile update (Firestore) failed:', error);
      }
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
    localStorage.removeItem('soob-user');
  }, []);

  // Firebase auth state listener — loads Firebase lazily
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    getFirebaseAuth().then(async (auth) => {
      const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');

      // Handle redirect result (fallback from popup-blocked)
      getRedirectResult(auth)
        .then((result) => {
          if (result) localStorage.removeItem('soob-auth-redirect');
        })
        .catch((error: unknown) => {
          const code = (error as { code?: string })?.code;
          const message = (error as { message?: string })?.message;
          console.error('Redirect sign-in error:', code, message);
          localStorage.removeItem('soob-auth-redirect');
        });

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const { displayName, email, photoURL, uid } = firebaseUser;

          const baseUser: SOOBUser = {
            name: displayName || email || '',
            email: email || '',
            photoURL,
            uid,
            provider: 'google',
            phone: null,
          };
          setUser(baseUser);
          localStorage.setItem('soob-user', JSON.stringify(baseUser));
          localStorage.setItem('soob-has-account', 'true');
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

          const userData: SOOBUser = { ...baseUser, phone };
          setUser(userData);
          setPhoneChecked(true);
          try { identifyUser(userData); } catch { /* analytics non-critical */ }
          localStorage.setItem('soob-user', JSON.stringify(userData));
        } else {
          setUser(null);
          setPhoneChecked(false);
          localStorage.removeItem('soob-user');
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
      loginWithOtp,
      updatePhone,
      updateProfile,
      logout,
      markOnboarded,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and actions.
 * Must be used within an AuthProvider — throws if not.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
