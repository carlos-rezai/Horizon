import { Router, type Request } from "express";
import type { Storage } from "../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.get("/status", async (req, res) => {
  const status = await getStorage(req).status();
  res.json(status);
});

export default router;
