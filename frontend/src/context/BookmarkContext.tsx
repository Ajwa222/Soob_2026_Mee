/**
 * Bookmark context — lets users save/unsave plans to their Firestore profile.
 *
 * Bookmarks are stored in the Firestore `users/{uid}.bookmarks` array.
 * For logged-out users, requestBookmark() queues the plan ID in localStorage
 * and applies it automatically after the next sign-in.
 *
 * Optimistic updates: UI toggles immediately, Firestore write is fire-and-forget.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { getFirebaseDb } from '../lib/firebase';
import { useAuth } from './AuthContext';

// localStorage key for bookmarks queued before login
const PENDING_KEY = 'simba-pending-bookmark';

interface BookmarkContextValue {
  bookmarkedIds: number[];                         // Plan IDs the user has bookmarked
  toggleBookmark: (planId: number) => void;        // Add or remove a bookmark (auth required)
  isBookmarked: (planId: number) => boolean;       // Check if a plan is bookmarked
  /** Queue a bookmark that will be saved after login. Returns false if user is not logged in. */
  requestBookmark: (planId: number) => boolean;
  loading: boolean;                                // True while fetching bookmarks from Firestore
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  // Fetch bookmarks from Firestore when user logs in, then apply any pending bookmark
  useEffect(() => {
    if (!isLoggedIn || !user?.uid) {
      setBookmarkedIds([]);
      fetched.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const db = await getFirebaseDb();
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;

        let ids: number[] = [];
        if (snap.exists()) {
          const data = snap.data();
          ids = Array.isArray(data.bookmarks) ? data.bookmarks : [];
        }

        // Apply pending bookmark from before login
        const pendingRaw = localStorage.getItem(PENDING_KEY);
        if (pendingRaw) {
          localStorage.removeItem(PENDING_KEY);
          const pendingId = Number(pendingRaw);
          if (pendingId && !ids.includes(pendingId)) {
            ids = [...ids, pendingId];
            setDoc(doc(db, 'users', user.uid), { bookmarks: ids }, { merge: true }).catch(() => {});
          }
        }

        setBookmarkedIds(ids);
        fetched.current = true;
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Failed to fetch bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, user?.uid]);

  const toggleBookmark = useCallback((planId: number) => {
    if (!user) return;

    setBookmarkedIds(prev => {
      const next = prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId];

      // Fire-and-forget Firestore write
      (async () => {
        try {
          const db = await getFirebaseDb();
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', user.uid), { bookmarks: next }, { merge: true });
        } catch (err) {
          if (import.meta.env.DEV) console.error('Failed to save bookmarks:', err);
        }
      })();

      return next;
    });
  }, [user]);

  const isBookmarked = useCallback((planId: number) => {
    return bookmarkedIds.includes(planId);
  }, [bookmarkedIds]);

  const requestBookmark = useCallback((planId: number): boolean => {
    if (isLoggedIn && user) {
      toggleBookmark(planId);
      return true;
    }
    // Store pending bookmark for after login
    localStorage.setItem(PENDING_KEY, String(planId));
    return false;
  }, [isLoggedIn, user, toggleBookmark]);

  const value = useMemo(() => ({
    bookmarkedIds, toggleBookmark, isBookmarked, requestBookmark, loading,
  }), [bookmarkedIds, toggleBookmark, isBookmarked, requestBookmark, loading]);

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

/**
 * Hook to access bookmark state and actions.
 * Must be used within a BookmarkProvider — throws if not.
 */
export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be used within BookmarkProvider');
  return ctx;
}
