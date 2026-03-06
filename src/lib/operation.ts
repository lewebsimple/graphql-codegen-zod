import { Types } from "@graphql-codegen/plugin-helpers";
import { Kind, OperationDefinitionNode } from "graphql";

export function getOperationDefinitions(
  documents: Types.DocumentFile[],
): OperationDefinitionNode[] {
  const operations = new Set<OperationDefinitionNode>();
  const seen = new Set<string>();
  for (const { document, location } of documents) {
    if (!document) continue;
    for (const definition of document.definitions) {
      if (definition.kind === Kind.OPERATION_DEFINITION) {
        if (!definition.name?.value) {
          throw new Error(`Unnamed operation definition found in document ${location}`);
        }
        if (seen.has(definition.name.value)) {
          throw new Error(`Duplicate operation definition for ${definition.name.value}`);
        }
        operations.add(definition);
        seen.add(definition.name.value);
      }
    }
  }
  return Array.from(operations);
}
