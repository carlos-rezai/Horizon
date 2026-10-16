import { Router, type Request } from "express";
import { MortgageSetupSchema } from "./mortgage.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/", async (req, res) => {
  const parsed = MortgageSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const account = await getStorage(req).mortgages.create(parsed.data);
  res.status(201).json(account);
});

export default router;
