import { DirectiveLocation } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-types";

/** Removes nullability from fields and variables. */
export const requiredDirective: DirectiveDefinition = {
  name: "required",
  stage: "transform",
  requires: ["null:allowed"],
  removes: ["null:allowed", "optional:allowed"],
  adds: ["null:rejected", "optional:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) => state,
};
