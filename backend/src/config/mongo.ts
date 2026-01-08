import mongoose from "mongoose";
import { env } from "./env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    if (!env.mongoUri) {
      throw new Error("Missing MONGODB_URI environment variable");
    }

    connectionPromise = mongoose.connect(env.mongoUri, {
      autoIndex: env.nodeEnv !== "production",
    });

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
    });
  }

  return connectionPromise;
};

