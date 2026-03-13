import { DirectiveLocation, valueFromASTUntyped } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-types";

/** Applies a default value to output fields. */
export const defaultDirective: DirectiveDefinition = {
  name: "default",
  stage: "transform",
  requires: ["null:allowed", "transform:allowed"],
  removes: ["null:allowed"],
  adds: ["null:rejected"],
  locations: [DirectiveLocation.FIELD],
  args: [{ name: "value", typeSDL: "String" }],
  apply: ({ state, directive }) => {
    const valueArgument = directive.arguments?.find((arg) => arg.name.value === "value");
    if (!valueArgument) {
      return state;
    }

    const defaultValue = valueFromASTUntyped(valueArgument.value);

    return {
      ...state,
      schema: `${state.schema}.nullable()`,
      transforms: [
        ...state.transforms,
        `.transform((value) => (value == null ? ${JSON.stringify(defaultValue)} : value))`,
      ],
    };
  },
};
