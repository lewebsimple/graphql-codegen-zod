import { z } from "zod";

export const enumSchema = z.enum(["ADMIN", "USER"]);
export type UserRoleEnum = z.infer<typeof enumSchema>;
