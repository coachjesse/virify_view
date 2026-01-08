import { Router } from "express";
import { z } from "zod";
import { ApiKeyModel } from "../models/apiKey.model";

const router = Router();

const apiKeySchema = z.object({
  apiKey: z.string().trim(),
});

const DEFAULT_KEY_NAME = "numverify";

router.get("/", async (_req, res, next) => {
  try {
    const record = await ApiKeyModel.findOne({ name: DEFAULT_KEY_NAME }).lean();
    res.json({
      apiKey: record?.value ?? "",
      updatedAt: record?.updatedAt ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { apiKey } = apiKeySchema.parse(req.body);
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      await ApiKeyModel.deleteOne({ name: DEFAULT_KEY_NAME });
      return res.json({ apiKey: "" });
    }

    const record = await ApiKeyModel.findOneAndUpdate(
      { name: DEFAULT_KEY_NAME },
      { value: trimmedKey },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(200).json({
      apiKey: record?.value ?? trimmedKey,
      updatedAt: record?.updatedAt ?? new Date(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.flatten() });
    }
    next(error);
  }
});

router.delete("/", async (_req, res, next) => {
  try {
    await ApiKeyModel.deleteOne({ name: DEFAULT_KEY_NAME });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

