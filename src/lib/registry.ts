import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";

import type { DepIdentifier } from "./deps";
import { getDepSchemaIdentifier, getImports } from "./deps";
import { getEnumTypes } from "./enum";
import { getFragmentDefinitions } from "./fragment";
import { getOperationDefinitions } from "./operation";

export type GetRegistryPluginOutputOptions = {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
};

/**
 * Generates the module for the top-level registry.
 * @param schema GraphQL schema.
 * @param documents Parsed GraphQL documents.
 * @returns Generated module source content.
 */
export function getRegistryPluginOutput({
  schema,
  documents,
}: GetRegistryPluginOutputOptions): string {
  // Collect dependencies for imports and registry entries for enums, fragments, and operations.
  const deps = new Set<DepIdentifier>();

  // Enums
  const enumEntries: string[] = [];
  for (const { name } of getEnumTypes(schema)) {
    deps.add({ name, kind: "enum" });
    enumEntries.push(getRegistryEntry({ name, kind: "enum" }));
  }

  // Fragments
  const fragmentEntries: string[] = [];
  for (const fragmentDef of getFragmentDefinitions(documents)) {
    const fragmentName = fragmentDef.name.value;
    deps.add({ name: fragmentName, kind: "fragment" });
    fragmentEntries.push(getRegistryEntry({ name: fragmentName, kind: "fragment" }));
  }

  // Documents / Operations (flat registry keyed by operation name)
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
 * Generates a registry entry for the given dependency.
 * @param dep Dependency identifier.
 * @returns Registry entry as a string.
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
        `  },`,
      ].join("\n");
  }
}
