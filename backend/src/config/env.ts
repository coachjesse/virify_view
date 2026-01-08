import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  appName: process.env.APP_NAME ?? "virify-backend",
};

if (!env.mongoUri) {
  // eslint-disable-next-line no-console
  console.warn("MONGODB_URI is not set. The server will fail to start without it.");
}

export const isProduction = env.nodeEnv === "production";

