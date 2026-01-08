import { Schema, model } from "mongoose";

export interface ApiKeyDocument {
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ApiKeyModel = model<ApiKeyDocument>("ApiKey", apiKeySchema);

