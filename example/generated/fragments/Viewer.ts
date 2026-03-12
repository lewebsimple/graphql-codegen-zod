import { z } from "zod";

import { enumSchema as zodUserRoleEnumSchema } from "../enums/UserRole";

export const fragmentSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: zodUserRoleEnumSchema,
  name: z.string(),
});
export type ViewerFragment = z.infer<typeof fragmentSchema>;
