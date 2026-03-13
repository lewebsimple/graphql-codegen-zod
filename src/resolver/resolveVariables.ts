import type { GraphQLSchema, VariableDefinitionNode } from "graphql";
import { valueFromASTUntyped } from "graphql";

import type { Capability } from "../core/capabilities";
import type { ZodTypeNode } from "../core/ZodTypeNode";

import { resolveInputType } from "./resolveInputType";
import { resolveTypeNode } from "./resolveTypeNode";

/**
 * Resolves operation variables into a renderable input object node.

 * @param input Schema and optional variable definitions.
 * @returns Root input object node for the variables payload.
 */
export function resolveVariables({
  schema,
  variableDefinitions,
}: {
  schema: GraphQLSchema;
  variableDefinitions?: readonly VariableDefinitionNode[];
}): ZodTypeNode {
  const children: ZodTypeNode[] = [];

  for (const variableDefinition of variableDefinitions ?? []) {
    const variableName = variableDefinition.variable.name.value;
    const resolvedType = resolveInputType(schema, variableDefinition.type);
    const resolved = resolveTypeNode({
      graphqlType: resolvedType,
      directives: variableDefinition.directives ?? [],
      ioType: "input",
    }).node;

    const defaultValue = variableDefinition.defaultValue
      ? valueFromASTUntyped(variableDefinition.defaultValue)
      : undefined;

    children.push({ ...resolved, name: variableName, defaultValue });
  }

  return {
    kind: "object",
    graphqlType: schema,
    children,
    directives: [],
    capabilities: new Set<Capability>(["object", "input"]),
    name: "Variables",
  };
}
