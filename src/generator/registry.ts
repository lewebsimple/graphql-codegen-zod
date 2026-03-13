import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";

import type { DepIdentifier } from "../core/deps";

import { getDepSchemaIdentifier, getImports } from "./deps";
import { getEnumTypes, getFragmentDefinitions, getOperationDefinitions } from "./documents";

/** Options for registry module generation. */
export type GetRegistryPluginOutputOptions = {
  /** GraphQL schema used for enum discovery. */
  schema: GraphQLSchema;
  /** Parsed GraphQL documents used for fragment and operation discovery. */
  documents: Types.DocumentFile[];
};

/**
 * Generates the top-level registry module.

 * @param options Registry generation options.
 * @returns Generated registry module source.
 */
export function getRegistryPluginOutput({
  schema,
  documents,
}: GetRegistryPluginOutputOptions): string {
  const deps = new Set<DepIdentifier>();

  const enumEntries: string[] = [];
  for (const { name } of getEnumTypes(schema)) {
    deps.add({ name, kind: "enum" });
    enumEntries.push(getRegistryEntry({ name, kind: "enum" }));
  }

  const fragmentEntries: string[] = [];
  for (const fragmentDef of getFragmentDefinitions(documents)) {
    const fragmentName = fragmentDef.name.value;
    deps.add({ name: fragmentName, kind: "fragment" });
    fragmentEntries.push(getRegistryEntry({ name: fragmentName, kind: "fragment" }));
  }

  const operationEntries: string[] = [];
  for (const operationDef of getOperationDefinitions(documents)) {
    const operationType = operationDef.operation;
    const operationName = operationDef.name!.value;

    deps.add({ name: operationName, kind: "document" });
    deps.add({ name: operationName, kind: operationType });
    operationEntries.push(getRegistryEntry({ name: operationName, kind: operationType }));
  }

  return [
    ...getImports({ zod: false, rootDir: ".", deps }),
    "",
    "export const enums = {",
    ...enumEntries,
    "} as const;",
    "",
    "export const fragments = {",
    ...fragmentEntries,
    "} as const;",
    "",
    "export const operations = {",
    ...operationEntries,
    "} as const;",
  ].join("\n");
}

/**
 * Renders a single registry entry.

 * @param dep Dependency to serialize into the registry.
 * @returns Registry entry source line or block.
 */
function getRegistryEntry({ name, kind }: DepIdentifier): string {
  switch (kind) {
    case "document":
      throw new Error("Document entries are injected in the operations registry.");

    case "enum":
      return `  "${name}": { schema: ${getDepSchemaIdentifier({ name, kind })} },`;

    case "fragment":
      return `  "${name}": { schema: ${getDepSchemaIdentifier({ name, kind })} },`;

    case "query":
    case "mutation":
    case "subscription":
      return [
        `  ${name}: {`,
        `    kind: "${kind}",`,
        `    document: ${name}Document,`,
        `    resultSchema: ${getDepSchemaIdentifier({ name, kind, target: "result" })},`,
        `    variablesSchema: ${getDepSchemaIdentifier({ name, kind, target: "variables" })},`,
        "  },",
      ].join("\n");
  }
}
