import type { Types } from "@graphql-codegen/plugin-helpers";
import type {
  GraphQLObjectType,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from "graphql";
import { Kind } from "graphql";

import type { DepIdentifier } from "./deps";
import { getImports } from "./deps";
import { getZodSelection } from "./selection";
import { getZodVariables } from "./variables";

/**
 * Collects unique named operations and fails on duplicates.
 * @param documents Parsed GraphQL documents.
 * @returns Unique operation definitions.
 */
export function getOperationDefinitions(
  documents: Types.DocumentFile[],
): OperationDefinitionNode[] {
  const operations = new Set<OperationDefinitionNode>();
  const seen = new Set<string>();

  for (const { document, location } of documents) {
    if (!document) continue;
    for (const definition of document.definitions) {
      if (definition.kind !== Kind.OPERATION_DEFINITION) {
        continue;
      }

      const operationType = definition.operation;
      if (!["query", "mutation", "subscription"].includes(operationType)) {
        continue;
      }

      const operationName = definition.name?.value;
      if (!operationName) {
        throw new Error(`Unnamed operation definition found in document ${location}`);
      }

      if (seen.has(operationName)) {
        throw new Error(
          `Duplicate operation definition for ${operationName} found in document ${location}`,
        );
      }
      seen.add(operationName);

      operations.add(definition);
    }
  }

  return Array.from(operations).sort((left, right) =>
    left.name!.value.localeCompare(right.name!.value),
  );
}

/**
 * Finds an operation definition by operation type and name.
 * @param documents Parsed GraphQL documents.
 * @param operationType Operation kind (`query`, `mutation`, `subscription`).
 * @param operationName Operation name.
 * @returns Operation definition, or `null` when absent.
 */
export function getOperationDefinition(
  documents: Types.DocumentFile[],
  operationType: OperationTypeNode,
  operationName: string,
): OperationDefinitionNode | null {
  const operations = getOperationDefinitions(documents);
  return (
    operations.find(
      ({ operation, name }) => operation === operationType && name?.value === operationName,
    ) || null
  );
}

type GetOperationPluginOutputOptions = {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
  operationType: OperationTypeNode;
  operationName: string;
};
/**
 * Generates a module for a single operation.
 * @param schema GraphQL schema.
 * @param documents Parsed GraphQL documents.
 * @param operationType Operation kind (`query`, `mutation`, `subscription`).
 * @param operationName Operation name to generate.
 * @returns Generated module source content.
 */
export function getOperationPluginOutput({
  schema,
  documents,
  operationType,
  operationName,
}: GetOperationPluginOutputOptions): string {
  // Find OperationDefinitionNode from operationType and operationName
  const operationDef = getOperationDefinition(documents, operationType, operationName);
  if (!operationDef) {
    throw new Error(`Could not find operation definition for ${operationType} ${operationName}`);
  }

  // Determine parent type of the operation, i.e. root operation type (object or interface only)
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

  // Extract Zod schema for result and variables from selection set
  const { selectionSet, variableDefinitions: variablesDef } = operationDef;
  const deps = new Set<DepIdentifier>();
  const zodResult = getZodSelection({ schema, selectionSet, parentType, deps });
  const zodVariables = getZodVariables({ schema, variablesDef, deps });

  return [
    ...getImports({ zod: true, rootDir: "..", deps }),
    `export const resultSchema = ${zodResult};`,
    `export const variablesSchema = ${zodVariables};`,
    `export type ${operationName}Result = z.infer<typeof resultSchema>;`,
    `export type ${operationName}Variables = z.input<typeof variablesSchema>;`,
  ].join("\n");
}
