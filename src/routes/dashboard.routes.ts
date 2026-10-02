import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.ts";
import { Doctor } from "../models/doctor.model.ts";
import { Patient } from "../models/patient.model.ts";
import type { createAuth } from "../lib/auth.ts";

export const createDashboardRouter = (auth: ReturnType<typeof createAuth>) => {
  const router = Router();

  router.get("/", requireAuth(auth), async (_req, res, next) => {
    try {
      const [totalDoctors, totalPatients, patientsPerDoctor, patientsByDate] =
        await Promise.all([
          Doctor.countDocuments(),
          Patient.countDocuments(),
          Patient.aggregate([
            { $group: { _id: "$doctorId", patientCount: { $sum: 1 } } },
            { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
            { $unwind: "$doctor" },
            { $project: { _id: 0, doctorId: "$doctor._id", doctorName: "$doctor.name", patientCount: 1 } },
            { $sort: { patientCount: -1 } },
            { $limit: 10 },
          ]),
          Patient.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 25 },
            { $sort: { _id: 1 } },
          ]),
        ]);
      res.json({ data: { totalDoctors, totalPatients, patientsPerDoctor, patientsByDate } });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
