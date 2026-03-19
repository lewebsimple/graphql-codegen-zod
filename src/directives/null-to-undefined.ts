import { DirectiveLocation } from "graphql";

import { withNullableTransform, type DirectiveDefinition } from "../pipeline/directive-helpers";

/** Coerces `null` values into `undefined`. */
export const nullToUndefinedDirective: DirectiveDefinition = {
  name: "nullToUndefined",
  stage: "transform",
  requires: ["null:allowed", "transform:allowed"],
  removes: ["null:allowed"],
  adds: ["null:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) =>
    withNullableTransform(state, ".transform((value) => (value === null ? undefined : value))"),
};
