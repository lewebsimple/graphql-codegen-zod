import { z } from "zod";

import { fragmentSchema as zodViewerFragmentSchema } from "../fragments/Viewer";

export const resultSchema = z.object({ getUser: zodViewerFragmentSchema });
export const variablesSchema = z.object({ id: z.string(), email: z.email().nullish() });
export type GetUserResult = z.infer<typeof resultSchema>;
export type GetUserVariables = z.input<typeof variablesSchema>;
