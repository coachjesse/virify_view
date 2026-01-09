import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { connectToDatabase } from "./config/mongo";
import { env } from "./config/env";
import apiKeyRouter from "./routes/apiKey.routes";

const app = express();

app.use(
  cors({
    
    origin: env.corsOrigin === "*" ? "*" : env.corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: false,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: env.appName,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/api-key", apiKeyRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

const start = async () => {
  try {
    await connectToDatabase();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();

