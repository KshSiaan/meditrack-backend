import { isValidObjectId } from "mongoose";

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export const getPagination = (query: Record<string, unknown>) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const requireString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestValidationError(`${field} is required.`);
  }
  return value.trim();
};

export const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const requireObjectId = (value: unknown, field: string) => {
  if (typeof value !== "string" || !isValidObjectId(value)) {
    throw new RequestValidationError(`${field} must be a valid identifier.`);
  }
  return value;
};

export const dateFilter = (query: Record<string, unknown>) => {
  const filter: { $gte?: Date; $lte?: Date } = {};
  if (typeof query.from === "string") filter.$gte = new Date(query.from);
  if (typeof query.to === "string") {
    filter.$lte = new Date(query.to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      filter.$lte.setHours(23, 59, 59, 999);
    }
  }
  if (filter.$gte && Number.isNaN(filter.$gte.valueOf())) {
    throw new RequestValidationError("from must be a valid date.");
  }
  if (filter.$lte && Number.isNaN(filter.$lte.valueOf())) {
    throw new RequestValidationError("to must be a valid date.");
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
};
