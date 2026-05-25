import { z } from "zod";

export const CategoryCreateSchema = z.object({
  name: z.string().min(1),
});
