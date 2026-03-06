import type { Types } from "@graphql-codegen/plugin-helpers";
import { type FragmentDefinitionNode, Kind } from "graphql";

export function getFragmentDefinitions(documents: Types.DocumentFile[]): FragmentDefinitionNode[] {
  const fragments = new Set<FragmentDefinitionNode>();
  const seen = new Set<string>();

  for (const { document, location } of documents) {
    if (!document) continue;

    for (const definition of document.definitions) {
      if (definition.kind !== Kind.FRAGMENT_DEFINITION) {
        continue;
      }

      const fragmentName = definition.name.value;

      if (seen.has(fragmentName)) {
        throw new Error(
          `Duplicate fragment definition for ${fragmentName} found in document ${location}`,
        );
      }
      seen.add(fragmentName);

      fragments.add(definition);
    }
  }

  return Array.from(fragments);
}

export function getFragmentDefinition(
  documents: Types.DocumentFile[],
  fragmentName: string,
): FragmentDefinitionNode | null {
  const fragments = getFragmentDefinitions(documents);
  return fragments.find(({ name }) => name.value === fragmentName) || null;
}

export function getFragmentSchemaExpression(definition: FragmentDefinitionNode): string {
  return `z.object({})`;
}
