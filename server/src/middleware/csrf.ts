import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = randomBytes(24).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by frontend JS to echo back in the header
      sameSite: "strict",
      secure: res.req.secure,
      path: "/",
    });
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
  }
  next();
}

export function requireCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ success: false, message: "Invalid or missing CSRF token." });
    return;
  }
  next();
}
