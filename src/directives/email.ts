import { DirectiveLocation } from "graphql";

import type { DirectiveDefinition } from "./types";

/** Adds Zod email validation to scalar fields and variables. */
export const emailDirective: DirectiveDefinition = {
  name: "email",
  stage: "transform",
  requires: ["scalar"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) => ({
    ...state,
    transforms: [...state.transforms, ".email()"],
  }),
};
