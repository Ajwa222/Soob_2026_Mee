/**
 * Authentication middleware using Firebase Admin Auth.
 *
 * The frontend sends a Firebase ID token (from Google Sign-In) in the
 * "Authorization: Bearer <token>" header. This middleware verifies the token
 * and attaches user info (uid, name, photo) to the request object.
 *
 * Used on all routes that require a logged-in user (likes, comments, persona).
 */

import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/firebase.js";

/** Extended Request type with user info populated by requireAuth middleware */
export interface AuthenticatedRequest extends Request {
  uid?: string;              // Firebase UID of the authenticated user
  userName?: string;         // Display name from their Google account
  userPhoto?: string | null; // Profile photo URL from their Google account
}

/**
 * Express middleware that verifies Firebase ID tokens.
 * Rejects with 401 if the token is missing, malformed, or expired.
 * On success, populates req.uid, req.userName, and req.userPhoto.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  // Expect "Bearer <idToken>" format
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  // Extract the token after "Bearer "
  const idToken = header.slice(7);
  try {
    // Verify the token with Firebase Admin — checks signature, expiry, and issuer
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.userName = decoded.name ?? "Anonymous";
    req.userPhoto = decoded.picture ?? null;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
