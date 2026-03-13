import type { GraphQLSchema } from "graphql";

import { resolveTypeNode } from "../resolver/resolveTypeNode";

import { getImports } from "./deps";
import { getEnumType } from "./documents";
import { isRenderableEnumNode, renderEnumValuesSchema } from "./render-node";

/** Options for enum module generation. */
export type GetEnumPluginOutputOptions = {
  /** GraphQL schema used for enum lookup. */
  schema: GraphQLSchema;
  /** Enum type name to generate. */
  enumName: string;
};

/**
 * Generates the source module for a single enum schema.

 * @param options Enum generation options.
 * @returns Generated module source.
 */
export function getEnumPluginOutput({ schema, enumName }: GetEnumPluginOutputOptions): string {
  const enumType = getEnumType(schema, enumName);
  if (!enumType) {
    throw new Error(`Could not find enum type for ${enumName}`);
  }

  const resolved = resolveTypeNode({ graphqlType: enumType, ioType: "output" }).node;
  if (!isRenderableEnumNode(resolved)) {
    throw new Error(`Type ${enumName} is not a renderable enum type`);
  }

  const capabilities = new Set(resolved.capabilities);
  capabilities.delete("nullable");

  const zodEnum = renderEnumValuesSchema({ ...resolved, capabilities });

  return [
    ...getImports({ zod: true, rootDir: ".." }),
    `export const enumSchema = ${zodEnum};`,
    `export type ${enumName}Enum = z.infer<typeof enumSchema>;`,
  ].join("\n");
}
