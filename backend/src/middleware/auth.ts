import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/firebase.js";

export interface AuthenticatedRequest extends Request {
  uid?: string;
  userName?: string;
  userPhoto?: string | null;
}

/**
 * Middleware that verifies Firebase ID tokens.
 * Attach `Authorization: Bearer <idToken>` header from the frontend.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const idToken = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.userName = decoded.name ?? "Anonymous";
    req.userPhoto = decoded.picture ?? null;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
