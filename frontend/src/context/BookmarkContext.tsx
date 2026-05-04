/**
 * Bookmark context — lets users save/unsave any purchaseable item to their
 * Firestore profile. Bookmarks are typed (plans, vouchers, fiber, …) so
 * different surfaces can share one inbox.
 *
 * Storage shape (Firestore `users/{uid}.bookmarks`):
 *   [{ kind: 'plan',    id: '15' },
 *    { kind: 'voucher', id: 'apple-store' }, ...]
 *
 * For logged-out users, requestBookmark() queues the item in localStorage
 * and applies it automatically after the next sign-in.
 *
 * Optimistic updates: UI toggles immediately, Firestore write is fire-and-forget.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { getFirebaseDb } from '../lib/firebase';
import { useAuth } from './AuthContext';

const PENDING_KEY = 'soob-pending-bookmark';

export type BookmarkKind = 'plan' | 'voucher' | 'fiber';
export interface BookmarkItem {
  kind: BookmarkKind;
  id: string;
}

interface BookmarkContextValue {
  bookmarks: BookmarkItem[];
  /** All bookmarked plan IDs as numbers (for the legacy plans surface). */
  bookmarkedPlanIds: number[];
  /** Toggle a bookmark. Auth required. */
  toggleBookmark: (item: BookmarkItem) => void;
  /** Check if an item is bookmarked. Accepts string or number ids for convenience. */
  isBookmarked: (kind: BookmarkKind, id: string | number) => boolean;
  /** Try to bookmark; if not logged in, queues for after-login and returns false. */
  requestBookmark: (item: BookmarkItem) => boolean;
  loading: boolean;
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

/** Migrate legacy data: numeric arrays were plan-only. */
function normalize(raw: unknown): BookmarkItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'number') return { kind: 'plan' as const, id: String(entry) };
      if (typeof entry === 'string') return { kind: 'plan' as const, id: entry };
      if (entry && typeof entry === 'object' && 'kind' in entry && 'id' in entry) {
        const e = entry as { kind: unknown; id: unknown };
        if (typeof e.kind === 'string' && (typeof e.id === 'string' || typeof e.id === 'number')) {
          return { kind: e.kind as BookmarkKind, id: String(e.id) };
        }
      }
      return null;
    })
    .filter((x): x is BookmarkItem => x !== null);
}

function sameItem(a: BookmarkItem, b: BookmarkItem) {
  return a.kind === b.kind && a.id === b.id;
}

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.uid) {
      setBookmarks([]);
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

        let items: BookmarkItem[] = [];
        if (snap.exists()) {
          items = normalize(snap.data().bookmarks);
        }

        // Apply pending bookmark queued before login
        const pendingRaw = localStorage.getItem(PENDING_KEY);
        if (pendingRaw) {
          localStorage.removeItem(PENDING_KEY);
          try {
            const pending = JSON.parse(pendingRaw) as BookmarkItem;
            if (pending?.kind && pending?.id && !items.some(b => sameItem(b, pending))) {
              items = [...items, pending];
              setDoc(doc(db, 'users', user.uid), { bookmarks: items }, { merge: true }).catch(() => {});
            }
          } catch {
            // Legacy pending bookmark stored as a bare plan-id number string
            const planId = Number(pendingRaw);
            if (planId) {
              const item: BookmarkItem = { kind: 'plan', id: String(planId) };
              if (!items.some(b => sameItem(b, item))) {
                items = [...items, item];
                setDoc(doc(db, 'users', user.uid), { bookmarks: items }, { merge: true }).catch(() => {});
              }
            }
          }
        }

        setBookmarks(items);
        fetched.current = true;
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Failed to fetch bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, user?.uid]);

  const toggleBookmark = useCallback((item: BookmarkItem) => {
    if (!user) return;
    const norm: BookmarkItem = { kind: item.kind, id: String(item.id) };

    setBookmarks(prev => {
      const exists = prev.some(b => sameItem(b, norm));
      const next = exists ? prev.filter(b => !sameItem(b, norm)) : [...prev, norm];

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

  const isBookmarked = useCallback((kind: BookmarkKind, id: string | number) => {
    const idStr = String(id);
    return bookmarks.some(b => b.kind === kind && b.id === idStr);
  }, [bookmarks]);

  const requestBookmark = useCallback((item: BookmarkItem): boolean => {
    const norm: BookmarkItem = { kind: item.kind, id: String(item.id) };
    if (isLoggedIn && user) {
      toggleBookmark(norm);
      return true;
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify(norm));
    return false;
  }, [isLoggedIn, user, toggleBookmark]);

  const bookmarkedPlanIds = useMemo(
    () => bookmarks.filter(b => b.kind === 'plan').map(b => Number(b.id)).filter(n => !Number.isNaN(n)),
    [bookmarks],
  );

  const value = useMemo(() => ({
    bookmarks, bookmarkedPlanIds, toggleBookmark, isBookmarked, requestBookmark, loading,
  }), [bookmarks, bookmarkedPlanIds, toggleBookmark, isBookmarked, requestBookmark, loading]);

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
