import type { GraphQLInputType, GraphQLSchema, TypeNode } from "graphql";
import { GraphQLList, GraphQLNonNull, Kind, isInputType } from "graphql";

/**
 * Resolves a GraphQL type AST node into a concrete input type.

 * @param schema GraphQL schema used for named type lookup.
 * @param node AST node describing the input type.
 * @returns Resolved GraphQL input type.
 */
export function resolveInputType(schema: GraphQLSchema, node: TypeNode): GraphQLInputType {
  switch (node.kind) {
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveInputType(schema, node.type));
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveInputType(schema, node.type));
    default: {
      const named = schema.getType(node.name.value);
      if (!named || !isInputType(named)) {
        throw new Error(`Unknown type ${node.name.value}`);
      }
      return named;
    }
  }
}
