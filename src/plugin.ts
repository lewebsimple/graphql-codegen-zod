import type { PluginFunction, Types } from "@graphql-codegen/plugin-helpers";
import { GraphQLSchema, OperationTypeNode } from "graphql";
import { getEnumTypes, getEnumSchemaExpression } from "./lib/enum";

export type ZodPluginConfig =
  | { mode: "registry" }
  | { mode: "enum"; enumName: string }
  | { mode: "fragment"; fragmentName: string }
  | { mode: "operation"; operationType: OperationTypeNode; operationName: string };

export const plugin: PluginFunction<ZodPluginConfig> = (schema, documents, config) => {
  switch (config.mode) {
    case "enum":
      return getEnumModuleContent(schema, config.enumName);

    case "fragment":
      const { fragmentName } = config;
      return getFragmentModuleContent(schema, documents, fragmentName);

    case "operation":
      const { operationType, operationName } = config;
      return getOperationModuleContent(schema, documents, operationType, operationName);

    case "registry":
      return getRegistryModuleContent(schema, documents);
  }
};

function getEnumModuleContent(schema: GraphQLSchema, enumName: string): string {
  const enumType = getEnumTypes(schema).find(({ name }) => name === enumName);
  if (!enumType) {
    throw new Error(`Could not find enum type for ${enumName}`);
  }

  return [
    'import { z } from "zod";',
    "",
    `export const schema = ${getEnumSchemaExpression(enumType)};`,
    "",
  ].join("\n");
}

function getFragmentModuleContent(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  fragmentName: string,
): string {
  return [
    'import { z } from "zod";',
    "",
    // `export const schema = ${getFragmentSchemaExpression(fragmentType)};`,
  ].join("\n");
}

function getOperationModuleContent(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  operationType: OperationTypeNode,
  operationName: string,
): string {
  return "";
}

function getRegistryModuleContent(schema: GraphQLSchema, documents: Types.DocumentFile[]): string {
  return "";
}
