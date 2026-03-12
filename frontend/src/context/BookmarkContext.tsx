import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

const PENDING_KEY = 'simba-pending-bookmark';

interface BookmarkContextValue {
  bookmarkedIds: number[];
  toggleBookmark: (planId: number) => void;
  isBookmarked: (planId: number) => boolean;
  /** Queue a bookmark that will be saved after login. Returns false if user is not logged in. */
  requestBookmark: (planId: number) => boolean;
  loading: boolean;
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

    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
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
            // Persist the updated list
            setDoc(doc(db, 'users', user.uid), { bookmarks: ids }, { merge: true }).catch(() => {});
          }
        }

        setBookmarkedIds(ids);
        fetched.current = true;
      })
      .catch(err => {
        if (import.meta.env.DEV) console.warn('Failed to fetch bookmarks:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, user?.uid]);

  const toggleBookmark = useCallback((planId: number) => {
    if (!user) return;

    setBookmarkedIds(prev => {
      const next = prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId];

      setDoc(doc(db, 'users', user.uid), { bookmarks: next }, { merge: true })
        .catch(err => {
          if (import.meta.env.DEV) console.error('Failed to save bookmarks:', err);
        });

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

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be used within BookmarkProvider');
  return ctx;
}
