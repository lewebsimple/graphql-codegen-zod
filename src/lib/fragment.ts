import type { Types } from "@graphql-codegen/plugin-helpers";
import { type FragmentDefinitionNode, Kind } from "graphql";

export function getFragmentDefinitions(documents: Types.DocumentFile[]): FragmentDefinitionNode[] {
  const fragments = new Set<FragmentDefinitionNode>();
  const seen = new Set<string>();

  for (const { document } of documents) {
    if (!document) continue;
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        if (seen.has(definition.name.value)) {
          throw new Error(`Duplicate fragment definition for ${definition.name.value}`);
        }
        fragments.add(definition);
        seen.add(definition.name.value);
      }
    }
  }

  return Array.from(fragments);
}

export function getFragmentSchemaExpression(definition: FragmentDefinitionNode): string {
  return `z.object({})`;
}
