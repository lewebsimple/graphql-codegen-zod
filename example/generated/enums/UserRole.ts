import { z } from "zod";

export const enumSchema = z.enum(["ADMIN", "USER"]);
