import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";

import type { createAuth } from "../lib/auth.ts";

type Auth = ReturnType<typeof createAuth>;

export const requireAuth = (auth: Auth): RequestHandler => async (
  req,
  res,
  next,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    res.locals.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (auth: Auth): RequestHandler => async (
  req,
  res,
  next,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (session.user.role !== "admin") {
      res.status(403).json({ error: "Admin role required." });
      return;
    }
    res.locals.session = session;
    next();
  } catch (error) {
    next(error);
  }
};
