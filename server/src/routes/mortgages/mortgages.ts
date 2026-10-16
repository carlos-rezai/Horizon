import { Router, type Request } from "express";
import { MortgageSetupSchema, PAID_FROM_KINDS } from "./mortgage.js";
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
  const storage = getStorage(req);
  const repayment = parsed.data.repayment;
  if (repayment) {
    const paidFrom = await storage.accounts.findById(
      repayment.paidFromAccountId
    );
    if (!paidFrom || !PAID_FROM_KINDS.has(paidFrom.kind)) {
      res.status(400).json({
        issues: [
          {
            code: "custom",
            path: ["repayment", "paidFromAccountId"],
            message: "The repayment must be paid from a Girokonto or Tagesgeld",
          },
        ],
      });
      return;
    }
  }
  const account = await storage.mortgages.create(parsed.data);
  res.status(201).json(account);
});

export default router;
