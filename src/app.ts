import express from "express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";

import { createApiRouter } from "./routes/index.ts";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.ts";
import type { createAuth } from "./lib/auth.ts";

type Auth = ReturnType<typeof createAuth>;

export function createApp(auth: Auth) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ message: "MediTrack API is running" });
  });

  app.all("/api/auth/{*splat}", toNodeHandler(auth));
  app.use("/api", createApiRouter(auth));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
