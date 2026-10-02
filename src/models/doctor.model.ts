import { model, Schema } from "mongoose";

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    specialization: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    hospital: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
  },
  { timestamps: true },
);

doctorSchema.index({ name: "text", specialization: "text", hospital: "text" });
doctorSchema.index({ createdAt: -1 });

export const Doctor = model("Doctor", doctorSchema);
