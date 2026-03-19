import { DirectiveLocation } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-helpers";

/** Filters `null` items out of a list after parsing. */
export const filterNullItemsDirective: DirectiveDefinition = {
  name: "filterNullItems",
  stage: "transform",
  requires: ["type:list", "transform:allowed"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state }) => ({
    ...state,
    transforms: [
      ...state.transforms,
      ".transform((value) => (value == null ? value : value.filter((item): item is NonNullable<typeof item> => item != null)))",
    ],
  }),
};
