import { z } from "zod";

import { fragmentSchema as zodViewerFragmentSchema } from "../fragments/Viewer";

export const resultSchema = z.object({
  getUser: z.object({}).extend(zodViewerFragmentSchema.shape),
});
export const variablesSchema = z.object({ id: z.string() });
