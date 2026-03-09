import { sortBy } from "es-toolkit/array";
import type { GraphQLEnumType, GraphQLSchema } from "graphql";
import { isEnumType } from "graphql";

import { getImports } from "./deps";
import { getZodEnum } from "./zod";

/**
 * Returns all non-introspection enum types from the schema sorted by name.
 * @param schema GraphQL schema to inspect.
 * @returns Sorted enum type list.
 */
export function getEnumTypes(schema: GraphQLSchema): GraphQLEnumType[] {
  const enumTypes = Object.values(schema.getTypeMap()).filter(
    (type): type is GraphQLEnumType => isEnumType(type) && !type.name.startsWith("__"),
  );
  return sortBy(enumTypes, ["name"]);
}

/**
 * Resolves an enum type by name.
 * @param schema GraphQL schema to inspect.
 * @param enumName Enum type name.
 * @returns Matching enum type, or `null` if missing/non-enum.
 */
export function getEnumType(schema: GraphQLSchema, enumName: string): GraphQLEnumType | null {
  const type = schema.getType(enumName);
  return isEnumType(type) ? type : null;
}

export type GetEnumPluginOutputOptions = {
  schema: GraphQLSchema;
  enumName: string;
};

/**
 * Generates a module for a single enum schema.
 * @param schema GraphQL schema.
 * @param enumName Enum name to generate.
 * @returns Generated module source content.
 */
export function getEnumPluginOutput({ schema, enumName }: GetEnumPluginOutputOptions): string {
  // Find GraphQLEnumType from enumName
  const enumType = getEnumType(schema, enumName);
  if (!enumType) {
    throw new Error(`Could not find enum type for ${enumName}`);
  }

  const zodEnum = getZodEnum(enumType);

  return [
    ...getImports({ zod: true, rootDir: ".." }),
    `export const enumSchema = ${zodEnum};`,
  ].join("\n");
}
