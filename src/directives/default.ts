import { DirectiveLocation, valueFromASTUntyped } from "graphql";

import type { DirectiveDefinition } from "./types";

/** Applies a default value to input variables. */
export const defaultDirective: DirectiveDefinition = {
  name: "default",
  stage: "transform",
  requires: ["input"],
  locations: [DirectiveLocation.VARIABLE_DEFINITION],
  args: [{ name: "value", typeSDL: "String" }],
  apply: ({ state, directive }) => {
    const valueArgument = directive.arguments?.find((arg) => arg.name.value === "value");
    if (!valueArgument) {
      return state;
    }

    return {
      ...state,
      defaultValue: valueFromASTUntyped(valueArgument.value),
    };
  },
};
