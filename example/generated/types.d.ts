export type { UserRoleEnum } from "./enums/UserRole";
export type { ViewerFragment } from "./fragments/Viewer";
export type { GetUserResult, GetUserVariables } from "./operations/GetUser.query";

import type * as z from "zod";

import type { enums, fragments, operations } from "./registry";

type Keys<T> = keyof T extends never ? string : keyof T;

export type EnumName = Keys<typeof enums>;
export type EnumOf<T extends EnumName> = T extends keyof typeof enums
  ? z.infer<(typeof enums)[T]["schema"]>
  : unknown;

export type FragmentName = Keys<typeof fragments>;
export type FragmentOf<T extends FragmentName> = T extends keyof typeof fragments
  ? z.infer<(typeof fragments)[T]["schema"]>
  : unknown;

export type OperationName = Keys<typeof operations>;
export type ResultOf<T extends OperationName> = T extends keyof typeof operations
  ? z.infer<(typeof operations)[T]["resultSchema"]>
  : unknown;
export type VariablesOf<T extends OperationName> = T extends keyof typeof operations
  ? z.input<(typeof operations)[T]["variablesSchema"]>
  : unknown;
