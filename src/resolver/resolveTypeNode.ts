import type { DirectiveNode, GraphQLType } from "graphql";
import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql";

import type { Capability } from "../core/capabilities";
import type { ZodTypeNode } from "../core/ZodTypeNode";

/**
 * Resolves a GraphQL type into a renderable resolver node.

 * @param input GraphQL type, directives, and I/O context.
 * @returns Resolver node plus the top-level nullability flag.
 */
export function resolveTypeNode({
  graphqlType,
  directives = [],
  ioType,
}: {
  graphqlType: GraphQLType;
  directives?: readonly DirectiveNode[];
  ioType: "input" | "output";
}): { node: ZodTypeNode; nullable: boolean } {
  let nullable = true;
  let currentType = graphqlType;

  if (isNonNullType(currentType)) {
    nullable = false;
    currentType = currentType.ofType;
  }

  if (isListType(currentType)) {
    const child = resolveTypeNode({ graphqlType: currentType.ofType, ioType }).node;
    const capabilities: Capability[] = ["list", ioType];
    if (nullable) {
      capabilities.push("nullable");
    }

    return {
      node: {
        kind: "list",
        graphqlType: currentType,
        children: [child],
        directives,
        capabilities: new Set<Capability>(capabilities),
      },
      nullable,
    };
  }

  const namedType = getNamedType(currentType);
  let kind: ZodTypeNode["kind"] = "scalar";

  if (isScalarType(namedType)) {
    kind = "scalar";
  } else if (isEnumType(namedType)) {
    kind = "enum";
  } else if (
    isObjectType(namedType) ||
    isInterfaceType(namedType) ||
    isInputObjectType(namedType)
  ) {
    kind = "object";
  } else if (isUnionType(namedType)) {
    kind = "union";
  }

  const capabilities: Capability[] = [kind, ioType];
  if (nullable) {
    capabilities.push("nullable");
  }

  return {
    node: {
      kind,
      graphqlType: currentType,
      children: [],
      directives,
      capabilities: new Set<Capability>(capabilities),
      name: "name" in namedType ? namedType.name : undefined,
    },
    nullable,
  };
}
