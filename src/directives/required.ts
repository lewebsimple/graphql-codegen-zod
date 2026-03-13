import { DirectiveLocation } from "graphql";

import type { DirectiveDefinition } from "./types";

/** Removes nullability from fields and variables. */
export const requiredDirective: DirectiveDefinition = {
  name: "required",
  stage: "transform",
  requires: [],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) => ({
    ...state,
    nullable: false,
  }),
};
