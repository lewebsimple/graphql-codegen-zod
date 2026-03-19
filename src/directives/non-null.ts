import { DirectiveLocation } from "graphql";

import { targetArg, type DirectiveDefinition } from "../pipeline/directive-helpers";

/** Removes nullability from a field, variable, or immediate list item type. */
export const nonNullDirective: DirectiveDefinition = {
  name: "nonNull",
  stage: "transform",
  requires: ["null:allowed"],
  removes: ["null:allowed", "optional:allowed"],
  adds: ["null:rejected", "optional:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  args: [targetArg],
  apply: ({ state }) => state,
};
