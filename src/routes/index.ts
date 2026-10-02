import { Router } from "express";

import healthRouter from "./health.routes.ts";
import { createDashboardRouter } from "./dashboard.routes.ts";
import { createDoctorRouter } from "./doctor.routes.ts";
import { createPatientRouter } from "./patient.routes.ts";
import type { createAuth } from "../lib/auth.ts";

export const createApiRouter = (auth: ReturnType<typeof createAuth>) => {
  const apiRouter = Router();
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/dashboard", createDashboardRouter(auth));
  apiRouter.use("/doctors", createDoctorRouter(auth));
  apiRouter.use("/patients", createPatientRouter(auth));
  return apiRouter;
};
