import { Router } from "express";

import { getDatabaseStatus } from "../lib/db.ts";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const database = getDatabaseStatus();

  res.json({
    status: database.connected ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
