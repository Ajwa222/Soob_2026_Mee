import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePersona } from '../context/PersonaContext';
import {
  fetchReaction, toggleLike as fbToggleLike, toggleDislike as fbToggleDislike,
  fetchComments, addComment as fbAddComment, deleteComment as fbDeleteComment,
} from '../lib/planInteractions';
import type { PlanReaction, PlanComment } from '../types';
import { trackEvent } from '../lib/analytics';

const defaultReaction: PlanReaction = { likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };

export function usePlanInteractions(planId: number | undefined) {
  const { user } = useAuth();
  const { segment } = usePersona();
  const [reaction, setReaction] = useState<PlanReaction>(defaultReaction);
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchReaction(planId), fetchComments(planId)])
      .then(([r, c]) => {
        if (!cancelled) {
          setReaction(r);
          setComments(c);
        }
      })
      .catch((err) => { console.error("Failed to load plan interactions:", err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [planId]);

  const toggleLike = useCallback(async () => {
    if (!user || !planId) return;
    const uid = user.uid;
    const wasLiked = reaction.likedBy.includes(uid);
    const wasDisliked = reaction.dislikedBy.includes(uid);

    trackEvent(wasLiked ? 'plan_unliked' : 'plan_liked', { plan_id: planId });

    // Optimistic update
    setReaction(prev => ({
      likes: prev.likes + (wasLiked ? -1 : 1),
      dislikes: prev.dislikes + (wasDisliked ? -1 : 0),
      likedBy: wasLiked ? prev.likedBy.filter(id => id !== uid) : [...prev.likedBy, uid],
      dislikedBy: wasDisliked ? prev.dislikedBy.filter(id => id !== uid) : prev.dislikedBy,
    }));

    try {
      await fbToggleLike(planId, uid, segment ?? undefined);
    } catch {
      // Revert on error
      const fresh = await fetchReaction(planId);
      setReaction(fresh);
    }
  }, [user, planId, reaction, segment]);

  const toggleDislike = useCallback(async () => {
    if (!user || !planId) return;
    const uid = user.uid;
    const wasDisliked = reaction.dislikedBy.includes(uid);
    const wasLiked = reaction.likedBy.includes(uid);

    trackEvent(wasDisliked ? 'plan_undisliked' : 'plan_disliked', { plan_id: planId });

    // Optimistic update
    setReaction(prev => ({
      dislikes: prev.dislikes + (wasDisliked ? -1 : 1),
      likes: prev.likes + (wasLiked ? -1 : 0),
      dislikedBy: wasDisliked ? prev.dislikedBy.filter(id => id !== uid) : [...prev.dislikedBy, uid],
      likedBy: wasLiked ? prev.likedBy.filter(id => id !== uid) : prev.likedBy,
    }));

    try {
      await fbToggleDislike(planId, uid, segment ?? undefined);
    } catch {
      const fresh = await fetchReaction(planId);
      setReaction(fresh);
    }
  }, [user, planId, reaction, segment]);

  const addComment = useCallback(async (text: string) => {
    if (!user || !planId || !text.trim()) return;
    try {
      const comment = await fbAddComment(planId, user, text);
      setComments(prev => [comment, ...prev]);
      trackEvent('comment_added', { plan_id: planId });
    } catch (err) { console.error("Failed to add comment:", err); }
  }, [user, planId]);

  const removeComment = useCallback(async (commentId: string) => {
    if (!planId) return;
    trackEvent('comment_deleted', { plan_id: planId });
    setComments(prev => prev.filter(c => c.id !== commentId));
    try {
      await fbDeleteComment(planId, commentId);
    } catch {
      const fresh = await fetchComments(planId);
      setComments(fresh);
    }
  }, [planId]);

  return { reaction, comments, loading, toggleLike, toggleDislike, addComment, removeComment };
}
