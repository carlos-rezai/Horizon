import { z } from "zod";

export const MilestoneCreateSchema = z.object({
  name: z.string().min(1),
  accountId: z.string().min(1),
  targetBalance: z.number().int().nonnegative(),
});
