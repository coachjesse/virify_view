import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development", // development, production, test
  port: parseNumber(process.env.PORT, 5000),
  mongoUri: "mongodb+srv://coachjamesonline_db_user:MmUy9g3VMjBH6OFK@cluster0.1jadkfl.mongodb.net/",
  corsOrigin: "virify-view.vercel.app",
  appName: "virify-backend",
};

if (!env.mongoUri) {
  // eslint-disable-next-line no-console
  console.warn("MONGODB_URI is not set. The server will fail to start without it.");
}

export const isProduction = env.nodeEnv === "production";

