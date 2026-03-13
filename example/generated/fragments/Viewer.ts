import { z } from "zod";

import { enumSchema as zodUserRoleEnumSchema } from "../enums/UserRole";

export const fragmentSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: zodUserRoleEnumSchema,
  name: z
    .string()
    .nullable()
    .transform((value) => (value === null ? "Unknown" : value)),
});
export type ViewerFragment = z.infer<typeof fragmentSchema>;
