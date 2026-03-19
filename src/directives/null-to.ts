import {
  DirectiveLocation,
  GraphQLSchema,
  getNamedType,
  isScalarType,
  type GraphQLType,
} from "graphql";

import {
  getLiteralDirectiveArgumentValue,
  targetArg,
  valueArg,
  withNullableTransform,
  type DirectiveDefinition,
} from "../pipeline/directive-helpers";

/** Coerces `null` scalar values into a provided literal fallback. */
export const nullToDirective: DirectiveDefinition = {
  name: "nullTo",
  stage: "transform",
  requires: ["type:scalar", "null:allowed", "transform:allowed"],
  removes: ["null:allowed"],
  adds: ["null:rejected"],
  locations: [DirectiveLocation.FIELD, DirectiveLocation.VARIABLE_DEFINITION],
  args: [valueArg, targetArg],
  apply: ({ state, directive, node }) => {
    const fallback = getLiteralDirectiveArgumentValue(directive, "value");
    if (fallback === undefined) {
      throw new Error('Directive @nullTo requires a "value" argument');
    }

    assertSupportedFallbackValue(node.graphqlType, fallback);

    return withNullableTransform(
      state,
      `.transform((value) => (value === null ? ${JSON.stringify(fallback)} : value))`,
    );
  },
};

function assertSupportedFallbackValue(
  graphqlType: GraphQLType | GraphQLSchema,
  fallback: unknown,
): void {
  if (graphqlType instanceof GraphQLSchema) {
    return;
  }

  const namedType = getNamedType(graphqlType);
  if (!isScalarType(namedType)) {
    return;
  }

  switch (namedType.name) {
    case "String":
    case "ID":
      if (typeof fallback !== "string") {
        throw new Error(
          `Directive @nullTo value must be a string for GraphQL ${namedType.name} fields`,
        );
      }
      return;

    case "Int":
      if (!Number.isInteger(fallback)) {
        throw new Error("Directive @nullTo value must be an integer for GraphQL Int fields");
      }
      return;

    case "Float":
      if (typeof fallback !== "number") {
        throw new Error("Directive @nullTo value must be a number for GraphQL Float fields");
      }
      return;

    case "Boolean":
      if (typeof fallback !== "boolean") {
        throw new Error("Directive @nullTo value must be a boolean for GraphQL Boolean fields");
      }
      return;

    default:
      return;
  }
}
