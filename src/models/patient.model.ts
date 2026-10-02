import { model, Schema } from "mongoose";

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    dateOfBirth: { type: Date, required: true },
    condition: { type: String, required: true, trim: true, maxlength: 160 },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      index: true,
    },
    assignedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

patientSchema.index({ name: "text", email: "text", condition: "text" });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ condition: 1, createdAt: -1 });

export const Patient = model("Patient", patientSchema);
