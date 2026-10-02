import type { ErrorRequestHandler, RequestHandler } from "express";
import { RequestValidationError } from "../lib/validation.ts";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  if (error instanceof RequestValidationError || error?.name === "ValidationError") {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};
