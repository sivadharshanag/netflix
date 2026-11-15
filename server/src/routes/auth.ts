import { Router } from "express";
import type { AuthStatusResponse, LoginRequestBody, LoginResponse } from "../../../shared/types.js";
import { verifyPassword } from "../auth/password.js";
import { ensureCsrfCookie, requireCsrfToken } from "../middleware/csrf.js";
import { createLoginRateLimiter } from "../middleware/rateLimit.js";
import type { AppConfig } from "../config.js";

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();
  const loginRateLimiter = createLoginRateLimiter();

  router.get("/csrf-token", ensureCsrfCookie, (req, res) => {
    res.json({ csrfToken: req.cookies.csrfToken });
  });

  router.get("/status", (req, res) => {
    const body: AuthStatusResponse = { authenticated: Boolean(req.session.authenticated) };
    res.json(body);
  });

  router.post("/login", loginRateLimiter, requireCsrfToken, async (req, res) => {
    const { password } = (req.body ?? {}) as LoginRequestBody;

    if (typeof password !== "string" || password.length === 0) {
      const body: LoginResponse = { success: false, message: "Enter the birthday passcode." };
      res.status(400).json(body);
      return;
    }

    const isValid = await verifyPassword(config.passwordHash, password);

    if (!isValid) {
      const body: LoginResponse = { success: false, message: "That's not quite it. Try again." };
      res.status(401).json(body);
      return;
    }

    req.session.regenerate((error) => {
      if (error) {
        res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
        return;
      }
      req.session.authenticated = true;
      const body: LoginResponse = { success: true };
      res.json(body);
    });
  });

  router.post("/logout", requireCsrfToken, (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  return router;
}
