import type { DirectiveRegistry } from "../pipeline/directive-types";

import { coerceNullDirective } from "./coerce-null";
import { defaultDirective } from "./default";
import { emailDirective } from "./email";
import { requiredDirective } from "./required";

/** Shared directive registry consumed by schema extension and rendering. */
export const directiveRegistry: DirectiveRegistry = {
  [requiredDirective.name]: requiredDirective,
  [coerceNullDirective.name]: coerceNullDirective,
  [defaultDirective.name]: defaultDirective,
  [emailDirective.name]: emailDirective,
};
