import { DirectiveLocation, valueFromASTUntyped } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-types";

/** Coerces null values either to undefined or to a provided fallback value. */
export const coerceNullDirective: DirectiveDefinition = {
  name: "coerceNull",
  stage: "transform",
  requires: ["null:allowed", "transform:allowed"],
  removes: ["null:allowed"],
  adds: ["null:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  args: [
    { name: "value", typeSDL: "String" },
    { name: "to", typeSDL: "String" },
  ],
  apply: ({ state, directive }) => {
    const nullableSchema = `${state.schema}.nullable()`;
    const valueArgument = directive.arguments?.find((arg) => arg.name.value === "value");
    if (valueArgument) {
      const fallback = valueFromASTUntyped(valueArgument.value);
      return {
        ...state,
        schema: nullableSchema,
        transforms: [
          ...state.transforms,
          `.transform((value) => (value === null ? ${JSON.stringify(fallback)} : value))`,
        ],
      };
    }

    const toArgument = directive.arguments?.find((arg) => arg.name.value === "to");
    if (!toArgument || valueFromASTUntyped(toArgument.value) === "undefined") {
      return {
        ...state,
        schema: nullableSchema,
        transforms: [
          ...state.transforms,
          ".transform((value) => (value === null ? undefined : value))",
        ],
      };
    }

    return state;
  },
};
