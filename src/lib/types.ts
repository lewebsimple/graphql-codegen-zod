import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";

import { getEnumTypes } from "./enum";
import { getFragmentDefinitions } from "./fragment";
import { getOperationDefinitions } from "./operation";

export type GetTypesPluginOutputOptions = {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
};

/**
 * Generates a type-only barrel for enums, fragments, and operations.
 * @param schema GraphQL schema.
 * @param documents Parsed GraphQL documents.
 * @returns Generated module source content.
 */
export function getTypesPluginOutput({ schema, documents }: GetTypesPluginOutputOptions): string {
  const exports: string[] = [];

  // Enums
  const enumTypeNames: string[] = [];
  for (const { name: enumName } of getEnumTypes(schema)) {
    const typeName = `${enumName}Enum`;
    enumTypeNames.push(typeName);
    exports.push(`export type { ${typeName} } from "./enums/${enumName}";`);
  }

  // Fragments
  const fragmentTypeNames: string[] = [];
  for (const fragmentDef of getFragmentDefinitions(documents)) {
    const fragmentName = fragmentDef.name.value;
    const typeName = `${fragmentName}Fragment`;
    fragmentTypeNames.push(typeName);
    exports.push(`export type { ${typeName} } from "./fragments/${fragmentName}";`);
  }

  // Operations
  const operationTypeNames: string[] = [];
  for (const operationDef of getOperationDefinitions(documents)) {
    const operationName = operationDef.name!.value;
    const resultTypeName = `${operationName}Result`;
    const variablesTypeName = `${operationName}Variables`;

    operationTypeNames.push(resultTypeName, variablesTypeName);
    exports.push(
      `export type { ${resultTypeName}, ${variablesTypeName} } from "./operations/${operationName}.${operationDef.operation}";`,
    );
  }

  return exports.join("\n");
}
