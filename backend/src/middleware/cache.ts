/**
 * HTTP caching middleware for JSON responses.
 *
 * Sets Cache-Control headers so browsers and CDNs (e.g., CloudFront) can cache
 * responses without the client hitting the server on every request.
 *
 * Uses "stale-while-revalidate" (SWR) so users see cached data instantly while
 * the CDN fetches a fresh copy in the background.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware factory that sets Cache-Control and Content-Type headers.
 * @param maxAge  How long (in seconds) the response is considered fresh. Default: 300s (5 min).
 * @param swr     How long (in seconds) a stale response can be served while revalidating.
 *                Default: 2× maxAge.
 */
export function cacheJson(maxAge = 300, swr?: number) {
  const swrVal = swr ?? maxAge * 2;
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swrVal}`);
    res.set("Content-Type", "application/json");
    next();
  };
}
