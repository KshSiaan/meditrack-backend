import { Router } from "express";

import { requireAdmin, requireAuth } from "../middleware/auth.middleware.ts";
import { Patient } from "../models/patient.model.ts";
import { Doctor } from "../models/doctor.model.ts";
import {
  dateFilter,
  getPagination,
  optionalString,
  requireObjectId,
  requireString,
  RequestValidationError,
} from "../lib/validation.ts";
import type { createAuth } from "../lib/auth.ts";

export const createPatientRouter = (auth: ReturnType<typeof createAuth>) => {
  const router = Router();

  router.get("/", requireAuth(auth), async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const filter: Record<string, unknown> = {};
      const search = optionalString(req.query.search);
      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
          { condition: new RegExp(search, "i") },
        ];
      }
      if (req.query.condition) filter.condition = new RegExp(String(req.query.condition), "i");
      if (req.query.doctorId) filter.doctorId = requireObjectId(req.query.doctorId, "doctorId");
      const assignment = req.query.assignment;
      if (
        assignment !== undefined &&
        assignment !== "assigned" &&
        assignment !== "unassigned" &&
        assignment !== "all"
      ) {
        throw new RequestValidationError(
          "assignment must be assigned, unassigned, or all.",
        );
      }
      if (assignment === "assigned") {
        filter.doctorId = { $exists: true, $ne: null };
      } else if (assignment === "unassigned") {
        filter.doctorId = { $in: [null], };
      }
      const assignedAt = dateFilter(req.query);
      if (assignedAt) {
        const assignmentFilter = {
          $or: [
            { assignedAt },
            { assignedAt: { $exists: false }, createdAt: assignedAt },
          ],
        };
        const searchFilter = filter.$or;
        filter.$and = [
          ...(Array.isArray(filter.$and) ? filter.$and : []),
          ...(Array.isArray(searchFilter) ? [{ $or: searchFilter }] : []),
          assignmentFilter,
        ];
        delete filter.$or;
      }

      const [data, total] = await Promise.all([
        Patient.find(filter)
          .populate("doctorId", "name specialization hospital email phone")
          .sort({ assignedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Patient.countDocuments(filter),
      ]);
      res.json({ data, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/:doctorId", requireAdmin(auth), async (req, res, next) => {
    try {
      const doctorId = requireObjectId(req.params.doctorId, "doctor id");
      if (!(await Doctor.exists({ _id: doctorId }))) {
        res.status(404).json({ error: "Doctor not found." });
        return;
      }
      const patient = await Patient.create({
        name: requireString(req.body.name, "name"),
        email: requireString(req.body.email, "email"),
        phone: requireString(req.body.phone, "phone"),
        dateOfBirth: requireString(req.body.dateOfBirth, "dateOfBirth"),
        condition: requireString(req.body.condition, "condition"),
        doctorId,
        assignedAt: new Date(),
      });
      res.status(201).json({ data: await patient.populate("doctorId", "name specialization hospital") });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAdmin(auth), async (req, res, next) => {
    try {
      const patientId = requireObjectId(req.params.id, "patient id");
      const updates = ["name", "email", "phone", "dateOfBirth", "condition", "doctorId"]
        .filter((field) => req.body[field] !== undefined)
        .reduce<Record<string, unknown>>(
          (result, field) => ({ ...result, [field]: req.body[field] }),
          {},
        );
      if (updates.doctorId !== undefined && updates.doctorId !== null) {
        updates.doctorId = requireObjectId(updates.doctorId, "doctorId");
        if (!(await Doctor.exists({ _id: updates.doctorId }))) {
          res.status(404).json({ error: "Doctor not found." });
          return;
        }
        updates.assignedAt = new Date();
      } else if (updates.doctorId === null) {
        delete updates.doctorId;
        updates.$unset = { doctorId: "", assignedAt: "" };
      }
      const patient = await Patient.findByIdAndUpdate(patientId, updates, {
        new: true,
        runValidators: true,
      }).populate("doctorId", "name specialization hospital").lean();
      if (!patient) {
        res.status(404).json({ error: "Patient not found." });
        return;
      }
      res.json({ data: patient });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireAdmin(auth), async (req, res, next) => {
    try {
      const patient = await Patient.findByIdAndDelete(requireObjectId(req.params.id, "patient id"));
      if (!patient) {
        res.status(404).json({ error: "Patient not found." });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
