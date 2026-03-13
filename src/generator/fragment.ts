import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";
import { isInterfaceType, isObjectType } from "graphql";

import type { DepIdentifier } from "../core/deps";
import { resolveSelection } from "../resolver/resolveSelection";

import { getImports } from "./deps";
import { getFragmentDefinition } from "./documents";
import { renderNodeToSchema } from "./render-node";

/** Options for fragment module generation. */
export type GetFragmentPluginOutputOptions = {
  /** GraphQL schema used for type lookup. */
  schema: GraphQLSchema;
  /** Parsed GraphQL documents. */
  documents: Types.DocumentFile[];
  /** Fragment name to generate. */
  fragmentName: string;
};

/**
 * Generates the source module for a single fragment schema.

 * @param options Fragment generation options.
 * @returns Generated module source.
 */
export function getFragmentPluginOutput({
  schema,
  documents,
  fragmentName,
}: GetFragmentPluginOutputOptions): string {
  const fragmentDef = getFragmentDefinition(documents, fragmentName);
  if (!fragmentDef) {
    throw new Error(`Could not find fragment definition for ${fragmentName}`);
  }

  const parentTypeName = fragmentDef.typeCondition.name.value;
  const parent = schema.getType(parentTypeName);
  if (!parent || (!isObjectType(parent) && !isInterfaceType(parent))) {
    throw new Error(`Fragment ${fragmentName} references unsupported type: ${parentTypeName}`);
  }

  const selectionNode = resolveSelection({
    schema,
    selectionSet: fragmentDef.selectionSet,
    parentType: parent,
  });

  const deps = new Set<DepIdentifier>();
  const zodFragment = renderNodeToSchema({ node: selectionNode, schema, deps });

  return [
    ...getImports({ zod: true, rootDir: "..", deps }),
    `export const fragmentSchema = ${zodFragment};`,
    `export type ${fragmentName}Fragment = z.infer<typeof fragmentSchema>;`,
  ].join("\n");
}
