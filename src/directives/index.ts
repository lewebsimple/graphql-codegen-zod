import { defaultDirective } from "./default";
import { emailDirective } from "./email";
import { requiredDirective } from "./required";
import type { DirectiveRegistry } from "./types";

/** Shared directive registry consumed by schema extension and rendering. */
export const directiveRegistry: DirectiveRegistry = {
  [requiredDirective.name]: requiredDirective,
  [defaultDirective.name]: defaultDirective,
  [emailDirective.name]: emailDirective,
};
