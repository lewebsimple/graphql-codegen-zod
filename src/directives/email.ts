import { DirectiveLocation } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-helpers";

/** Adds Zod email validation to scalar fields and variables. */
export const emailDirective: DirectiveDefinition = {
  name: "email",
  stage: "transform",
  requires: ["type:scalar"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) => ({
    ...state,
    schema: "z.email()",
  }),
};
