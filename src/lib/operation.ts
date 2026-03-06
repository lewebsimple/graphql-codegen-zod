import { Types } from "@graphql-codegen/plugin-helpers";
import { Kind, OperationDefinitionNode, OperationTypeNode } from "graphql";

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

      const key = `${operationType}:${operationName}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate operation definition for ${key} found in document ${location}`);
      }
      seen.add(key);

      operations.add(definition);
    }
  }

  return Array.from(operations);
}

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
