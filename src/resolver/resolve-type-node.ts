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
import type { ZodTypeNode } from "../core/zod-type-node";
import { splitTargetedDirectives } from "../pipeline/directive-helpers";

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
  const ioCapability: Capability = ioType === "input" ? "io:input" : "io:output";

  if (isNonNullType(currentType)) {
    nullable = false;
    currentType = currentType.ofType;
  }

  const { selfDirectives, itemDirectives } = splitTargetedDirectives({
    directives,
    isListType: isListType(currentType),
  });

  if (isListType(currentType)) {
    const child = resolveTypeNode({
      graphqlType: currentType.ofType,
      directives: itemDirectives,
      ioType,
    }).node;
    const capabilities: Capability[] = [
      "type:list",
      ioCapability,
      nullable ? "null:allowed" : "null:rejected",
    ];

    return {
      node: {
        kind: "list",
        graphqlType: currentType,
        children: [child],
        directives: selfDirectives,
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

  const typeCapability: Capability =
    kind === "scalar"
      ? "type:scalar"
      : kind === "enum"
        ? "type:enum"
        : kind === "object"
          ? "type:object"
          : "type:union";
  const capabilities: Capability[] = [
    typeCapability,
    ioCapability,
    nullable ? "null:allowed" : "null:rejected",
  ];

  return {
    node: {
      kind,
      graphqlType: currentType,
      children: [],
      directives: selfDirectives,
      capabilities: new Set<Capability>(capabilities),
      name: "name" in namedType ? namedType.name : undefined,
    },
    nullable,
  };
}
