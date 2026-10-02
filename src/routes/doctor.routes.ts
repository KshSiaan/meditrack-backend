import { Router } from "express";

import { requireAdmin, requireAuth } from "../middleware/auth.middleware.ts";
import { Doctor } from "../models/doctor.model.ts";
import { Patient } from "../models/patient.model.ts";
import {
  dateFilter,
  getPagination,
  optionalString,
  requireObjectId,
  requireString,
  RequestValidationError,
} from "../lib/validation.ts";
import type { createAuth } from "../lib/auth.ts";

export const createDoctorRouter = (auth: ReturnType<typeof createAuth>) => {
  const router = Router();

  router.get("/", requireAuth(auth), async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const search = optionalString(req.query.search);
      const filter: Record<string, unknown> = {};
      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { specialization: new RegExp(search, "i") },
          { hospital: new RegExp(search, "i") },
        ];
      }
      if (req.query.specialization) {
        filter.specialization = new RegExp(String(req.query.specialization), "i");
      }
      if (req.query.hospital) {
        filter.hospital = new RegExp(String(req.query.hospital), "i");
      }
      const createdAt = dateFilter(req.query);
      if (createdAt) filter.createdAt = createdAt;
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

      const doctorPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: "patients",
              localField: "_id",
              foreignField: "doctorId",
              as: "patients",
            },
          },
          { $addFields: { patientCount: { $size: "$patients" } } },
          ...(assignment === "assigned"
            ? [{ $match: { patientCount: { $gt: 0 } } }]
            : assignment === "unassigned"
              ? [{ $match: { patientCount: 0 } }]
              : []),
          { $project: { patients: 0 } },
          { $sort: { createdAt: -1 } },
        ] as const;

      const [items, countResult] = await Promise.all([
        Doctor.aggregate([...doctorPipeline, { $skip: skip }, { $limit: limit }]),
        Doctor.aggregate([...doctorPipeline, { $count: "total" }]),
      ]);
      const total = countResult[0]?.total ?? 0;

      res.json({ data: items, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/patients", requireAuth(auth), async (req, res, next) => {
    try {
      const doctorId = requireObjectId(req.params.id, "doctor id");
      const doctor = await Doctor.findById(doctorId).lean();
      if (!doctor) {
        res.status(404).json({ error: "Doctor not found." });
        return;
      }
      const { page, limit, skip } = getPagination(req.query);
      const [data, total] = await Promise.all([
        Patient.find({ doctorId })
          .populate("doctorId", "name specialization hospital email phone")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Patient.countDocuments({ doctorId }),
      ]);
      res.json({ doctor, data, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAdmin(auth), async (req, res, next) => {
    try {
      const doctor = await Doctor.create({
        name: requireString(req.body.name, "name"),
        specialization: requireString(req.body.specialization, "specialization"),
        hospital: requireString(req.body.hospital, "hospital"),
        phone: requireString(req.body.phone, "phone"),
        email: requireString(req.body.email, "email"),
      });
      res.status(201).json({ data: doctor });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAdmin(auth), async (req, res, next) => {
    try {
      const doctorId = requireObjectId(req.params.id, "doctor id");
      const updates = ["name", "specialization", "hospital", "phone", "email"]
        .filter((field) => typeof req.body[field] === "string")
        .reduce((result, field) => ({ ...result, [field]: req.body[field].trim() }), {});
      const doctor = await Doctor.findByIdAndUpdate(doctorId, updates, {
        new: true,
        runValidators: true,
      }).lean();
      if (!doctor) {
        res.status(404).json({ error: "Doctor not found." });
        return;
      }
      res.json({ data: doctor });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireAdmin(auth), async (req, res, next) => {
    try {
      const doctorId = requireObjectId(req.params.id, "doctor id");
      const patientCount = await Patient.countDocuments({ doctorId });
      if (patientCount > 0) {
        res.status(409).json({ error: "Reassign or delete patients before deleting this doctor." });
        return;
      }
      const doctor = await Doctor.findByIdAndDelete(doctorId);
      if (!doctor) {
        res.status(404).json({ error: "Doctor not found." });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
