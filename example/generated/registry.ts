import { GetUserDocument } from "./documents";
import { enumSchema as zodUserRoleEnumSchema } from "./enums/UserRole";
import { fragmentSchema as zodViewerFragmentSchema } from "./fragments/Viewer";
import {
  resultSchema as zodGetUserResultSchema,
  variablesSchema as zodGetUserVariablesSchema,
} from "./operations/GetUser.query";

export const enums = {
  UserRole: { schema: zodUserRoleEnumSchema },
} as const;

export const fragments = {
  Viewer: { schema: zodViewerFragmentSchema },
} as const;

export const operations = {
  GetUser: {
    kind: "query",
    document: GetUserDocument,
    resultSchema: zodGetUserResultSchema,
    variablesSchema: zodGetUserVariablesSchema,
  },
} as const;
