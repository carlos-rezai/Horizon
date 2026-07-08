import { z } from "zod";

export const CategoryCreateSchema = z.object({
  name: z.string().min(1),
});

// Recolor is a fixed-palette operation: `color` is a 6-digit hex string.
// Freeform hex outside the palette is still a valid hex here; the palette is
// enforced by the UI (the manager only offers the 20 swatches).
export const CategoryPatchSchema = z.object({
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
