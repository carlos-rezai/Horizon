import { Router, type Request } from "express";
import { MilestoneCreateSchema } from "../schemas/milestone.js";
import type { Storage } from "../storage/Storage.js";
import type { Milestone } from "../storage/types.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function toWire(milestone: Milestone): Record<string, unknown> {
  return {
    _id: milestone.id,
    name: milestone.name,
    accountId: milestone.accountId,
    targetBalance: milestone.targetBalance,
  };
}

router.post("/", async (req, res) => {
  const parsed = MilestoneCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const milestone = await getStorage(req).milestones.create(parsed.data);
  if (!milestone) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.status(201).json(toWire(milestone));
});

router.get("/", async (req, res) => {
  const milestones = await getStorage(req).milestones.findAll();
  res.json(milestones.map(toWire));
});

router.delete("/:id", async (req, res) => {
  const ok = await getStorage(req).milestones.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }
  res.status(204).send();
});

export default router;
