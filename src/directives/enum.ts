import { DirectiveLocation, getNamedType, isScalarType, isSchema } from "graphql";

import type { DirectiveDefinition } from "../pipeline/directive-helpers";
import { getLiteralDirectiveArgumentValue } from "../pipeline/directive-helpers";

function getEnumValues(directiveName: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `Directive @${directiveName} argument "values" must be a non-empty string array`,
    );
  }

  if (!value.every((entry) => typeof entry === "string")) {
    throw new Error(
      `Directive @${directiveName} argument "values" must contain only string literals`,
    );
  }

  return value;
}

/** Replaces a string scalar schema with a literal Zod enum schema. */
export const enumDirective: DirectiveDefinition = {
  name: "enum",
  stage: "transform",
  requires: ["type:scalar"],
  removes: ["type:scalar"],
  adds: ["type:enum"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  args: [
    {
      name: "values",
      typeSDL: "[String!]!",
    },
  ],
  apply: ({ state, directive, node }) => {
    if (isSchema(node.graphqlType)) {
      throw new Error("Directive @enum can only be applied to String fields or variables");
    }

    const namedType = getNamedType(node.graphqlType);
    if (!isScalarType(namedType) || namedType.name !== "String") {
      throw new Error("Directive @enum can only be applied to String fields or variables");
    }

    const values = getEnumValues(
      directive.name.value,
      getLiteralDirectiveArgumentValue(directive, "values"),
    );

    return {
      ...state,
      schema: `z.enum([${values.map((entry) => JSON.stringify(entry)).join(", ")}])`,
    };
  },
};
