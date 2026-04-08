import { DirectiveLocation, getNamedType, isScalarType, isSchema } from "graphql";

import { mergeDeps } from "../core/deps";
import type { DirectiveDefinition } from "../pipeline/directive-helpers";

/** Decodes HTML entities from GraphQL string fields and variables. */
export const decodeHTMLDirective: DirectiveDefinition = {
  name: "decodeHTML",
  stage: "transform",
  requires: ["type:scalar", "transform:allowed"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  apply: ({ state, node }) => {
    if (isSchema(node.graphqlType)) {
      throw new Error("Directive @decodeHTML can only be applied to String fields or variables");
    }

    const namedType = getNamedType(node.graphqlType);
    if (!isScalarType(namedType) || namedType.name !== "String") {
      throw new Error("Directive @decodeHTML can only be applied to String fields or variables");
    }

    mergeDeps(state.deps, [{ name: "decodeHTML", kind: "runtime" }]);

    return {
      ...state,
      transforms: [
        ...state.transforms,
        ".transform((value) => (value == null ? value : decodeHTML(value)))",
      ],
    };
  },
};
