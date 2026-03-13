import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from "graphql";

import type { DepIdentifier } from "../core/deps";
import { resolveSelection } from "../resolver/resolveSelection";
import { resolveVariables } from "../resolver/resolveVariables";

import { getImports } from "./deps";
import { getOperationDefinition } from "./documents";
import { renderNodeToSchema } from "./render-node";

/** Options for operation module generation. */
export type GetOperationPluginOutputOptions = {
  /** GraphQL schema used for root type lookup. */
  schema: GraphQLSchema;
  /** Parsed GraphQL documents. */
  documents: Types.DocumentFile[];
  /** Operation kind to generate. */
  operationType: OperationTypeNode;
  /** Operation name to generate. */
  operationName: string;
};

/**
 * Generates the source module for a single operation.

 * @param options Operation generation options.
 * @returns Generated module source.
 */
export function getOperationPluginOutput({
  schema,
  documents,
  operationType,
  operationName,
}: GetOperationPluginOutputOptions): string {
  const operationDef = getOperationDefinition(documents, operationType, operationName);
  if (!operationDef) {
    throw new Error(`Could not find operation definition for ${operationType} ${operationName}`);
  }

  let parentType: GraphQLObjectType | null | undefined;
  switch (operationType) {
    case "query":
      parentType = schema.getQueryType();
      break;
    case "mutation":
      parentType = schema.getMutationType();
      break;
    case "subscription":
      parentType = schema.getSubscriptionType();
      break;
  }

  if (!parentType) {
    throw new Error(
      `${operationType} root type for operation ${operationName} not found in schema`,
    );
  }

  const deps = new Set<DepIdentifier>();

  const zodResult = renderNodeToSchema({
    node: resolveSelection({
      schema,
      selectionSet: operationDef.selectionSet,
      parentType,
    }),
    schema,
    deps,
  });

  const zodVariables = operationDef.variableDefinitions?.length
    ? renderNodeToSchema({
        node: resolveVariables({
          schema,
          variableDefinitions: operationDef.variableDefinitions,
        }),
        schema,
        deps,
      })
    : "z.object({}).optional().default({})";

  return [
    ...getImports({ zod: true, rootDir: "..", deps }),
    `export const resultSchema = ${zodResult};`,
    `export const variablesSchema = ${zodVariables};`,
    `export type ${operationName}Result = z.infer<typeof resultSchema>;`,
    `export type ${operationName}Variables = z.input<typeof variablesSchema>;`,
  ].join("\n");
}
