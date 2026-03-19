import { DirectiveLocation } from "graphql";

import { withNullableTransform, type DirectiveDefinition } from "../pipeline/directive-helpers";

/** Coerces `null` lists into empty arrays. */
export const nullToEmptyDirective: DirectiveDefinition = {
  name: "nullToEmpty",
  stage: "transform",
  requires: ["type:list", "null:allowed", "transform:allowed"],
  removes: ["null:allowed"],
  adds: ["null:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) =>
    withNullableTransform(state, ".transform((value) => (value === null ? [] : value))"),
};
