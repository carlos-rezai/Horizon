import { Router, type Request } from "express";
import type { Storage } from "../storage/Storage.js";
import { generateSettlements } from "../services/settlementService.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/generate", async (req, res) => {
  const count = await generateSettlements(getStorage(req));
  res.json({ count });
});

export default router;
