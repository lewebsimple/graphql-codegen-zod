import type { Types } from "@graphql-codegen/plugin-helpers";
import join from "es-toolkit/compat/join";
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

  return [
    ...exports,
    ``,
    `import type { enums, fragments, operations } from "./registry";`,
    `import type * as z from "zod";`,
    ``,
    `type Keys<T> = keyof T extends never ? string : keyof T;`,
    ``,
    `export type EnumName = Keys<typeof enums>;`,
    `export type EnumOf<T extends EnumName> = T extends keyof typeof enums ? z.infer<(typeof enums)[T]["schema"]> : unknown;`,
    ``,
    `export type FragmentName = Keys<typeof fragments>;`,
    `export type FragmentOf<T extends FragmentName> = T extends keyof typeof fragments ? z.infer<(typeof fragments)[T]["schema"]> : unknown;`,
    ``,
    `export type OperationName = Keys<typeof operations>;`,
    `export type ResultOf<T extends OperationName> = T extends keyof typeof operations ? z.infer<(typeof operations)[T]["resultSchema"]> : unknown;`,
    `export type VariablesOf<T extends OperationName> = T extends keyof typeof operations ? z.input<(typeof operations)[T]["variablesSchema"]> : unknown;`,
  ].join("\n");
}
