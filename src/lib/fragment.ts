import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";
import { Kind, isInterfaceType, isObjectType, type FragmentDefinitionNode } from "graphql";

import { type DepIdentifier, getImports } from "./deps";
import { getZodSelection } from "./selection";

/**
 * Collects unique fragment definitions and fails on duplicate names.
 * @param documents Parsed GraphQL documents.
 * @returns Unique fragment definitions.
 */
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

  return Array.from(fragments).sort((left, right) =>
    left.name.value.localeCompare(right.name.value),
  );
}

/**
 * Finds a fragment definition by name.
 * @param documents Parsed GraphQL documents.
 * @param fragmentName Fragment name to resolve.
 * @returns Fragment definition, or `null` when absent.
 */
export function getFragmentDefinition(
  documents: Types.DocumentFile[],
  fragmentName: string,
): FragmentDefinitionNode | null {
  const fragments = getFragmentDefinitions(documents);
  return fragments.find(({ name }) => name.value === fragmentName) || null;
}

type GetFragmentPluginOutputOptions = {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
  fragmentName: string;
};

/**
 * Generates a module for a single fragment schema.
 * @param schema GraphQL schema.
 * @param documents Parsed GraphQL documents.
 * @param fragmentName Fragment name to generate.
 * @returns Generated module source content.
 */
export function getFragmentPluginOutput({
  schema,
  documents,
  fragmentName,
}: GetFragmentPluginOutputOptions): string {
  // Find FragmentDefinitionNode from fragmentName
  const fragmentDef = getFragmentDefinition(documents, fragmentName);
  if (!fragmentDef) {
    throw new Error(`Could not find fragment definition for ${fragmentName}`);
  }

  // Determine parent type of the fragment (object or interface only)
  const parentTypeName = fragmentDef.typeCondition.name.value;
  const parentType = schema.getType(parentTypeName);
  if (!parentType || (!isObjectType(parentType) && !isInterfaceType(parentType))) {
    throw new Error(`Fragment ${fragmentName} references unsupported type: ${parentTypeName}`);
  }

  // Extract Zod schema and dependencies from selection set
  const { selectionSet } = fragmentDef;
  const deps = new Set<DepIdentifier>();
  const zodFragment = getZodSelection({ schema, parentType, selectionSet, deps });

  return [
    ...getImports({ zod: true, rootDir: "..", deps }),
    `export const fragmentSchema = ${zodFragment};`,
    `export type ${fragmentName}Fragment = z.infer<typeof fragmentSchema>;`,
  ].join("\n");
}
