import type { PluginFunction, Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";
import { EnumDescriptor } from "./lib/enum";
import { getEnumTypes, getEnumValuesExpression } from "./lib/enum";
import { OperationDescriptor } from "./lib/operation";
import { FragmentDescriptor } from "./lib/fragment";

export type ZodPluginConfig =
  | { kind: "registry" }
  | OperationDescriptor
  | FragmentDescriptor
  | EnumDescriptor;

export const plugin: PluginFunction<ZodPluginConfig> = (schema, documents, config) => {
  switch (config.kind) {
    case "registry":
      return getRegistryModuleContent(schema, documents);

    case "query":
    case "mutation":
    case "subscription":
      return getOperationModuleContent(schema, documents, config);

    case "fragment":
      return getFragmentModuleContent(schema, documents, config);

    case "enum":
      return getEnumModuleContent(schema, config);
  }
};

function getRegistryModuleContent(schema: GraphQLSchema, documents: Types.DocumentFile[]): string {
  return "";
}

function getOperationModuleContent(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  { kind, operationName }: OperationDescriptor,
): string {
  return "";
}

function getFragmentModuleContent(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  { fragmentName }: FragmentDescriptor,
): string {
  return "";
}

function getEnumModuleContent(schema: GraphQLSchema, { enumName }: EnumDescriptor): string {
  const enumType = getEnumTypes(schema).find(({ name }) => name === enumName);
  if (!enumType) {
    throw new Error(`Could not find enum type for ${enumName}`);
  }

  return [
    'import { z } from "zod";',
    "",
    `export const schema = ${getEnumValuesExpression(enumType)};`,
    "",
  ].join("\n");
}
