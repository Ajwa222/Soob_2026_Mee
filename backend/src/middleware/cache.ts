import type { Request, Response, NextFunction } from "express";

/**
 * Sets Cache-Control and Content-Type: application/json headers.
 * @param maxAge  max-age in seconds (default 300)
 * @param swr     stale-while-revalidate in seconds (default 2× maxAge)
 */
export function cacheJson(maxAge = 300, swr?: number) {
  const swrVal = swr ?? maxAge * 2;
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swrVal}`);
    res.set("Content-Type", "application/json");
    next();
  };
}
