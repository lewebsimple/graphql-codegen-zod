import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";

import { getEnumTypes, getFragmentDefinitions, getOperationDefinitions } from "./documents";

/** Options for type barrel generation. */
export type GetTypesPluginOutputOptions = {
  /** GraphQL schema used for enum discovery. */
  schema: GraphQLSchema;
  /** Parsed GraphQL documents used for fragment and operation discovery. */
  documents: Types.DocumentFile[];
};

/**
 * Generates the type-only barrel file.

 * @param options Type barrel generation options.
 * @returns Generated type-only export source.
 */
export function getTypesPluginOutput({ schema, documents }: GetTypesPluginOutputOptions): string {
  const exports: string[] = [];

  for (const { name: enumName } of getEnumTypes(schema)) {
    const typeName = `${enumName}Enum`;
    exports.push(`export type { ${typeName} } from "./enums/${enumName}";`);
  }

  for (const fragmentDef of getFragmentDefinitions(documents)) {
    const fragmentName = fragmentDef.name.value;
    const typeName = `${fragmentName}Fragment`;
    exports.push(`export type { ${typeName} } from "./fragments/${fragmentName}";`);
  }

  for (const operationDef of getOperationDefinitions(documents)) {
    const operationName = operationDef.name!.value;
    const resultTypeName = `${operationName}Result`;
    const variablesTypeName = `${operationName}Variables`;

    exports.push(
      `export type { ${resultTypeName}, ${variablesTypeName} } from "./operations/${operationName}.${operationDef.operation}";`,
    );
  }

  return exports.join("\n");
}
