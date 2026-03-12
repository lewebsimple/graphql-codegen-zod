import type { GraphQLEnumType } from "graphql/type/definition";

/** Shared schema state used while building Zod expressions. */
export type ZodSchemaState = {
  zodSchema: string;
  nullable: boolean;
  optional: boolean;
  defaultValue?: unknown;
  transforms: string[];
};

/**
 * Get Zod schema from a GraphQL scalar type.
 * @param scalarName GraphQL scalar name.
 * @returns Zod schema string.
 */
export function getZodScalar(scalarName: string): string {
  switch (scalarName) {
    case "Boolean":
      return "z.boolean()";

    case "Int":
    case "Float":
      return "z.number()";

    case "ID":
    case "String":
      return "z.string()";

    default:
      return "z.unknown()";
  }
}

/**
 * Get Zod schema from GraphQL enum.
 * @param enumType Enum type metadata.
 * @returns Zod schema string.
 */
export function getZodEnum(enumType: GraphQLEnumType): string {
  const values = enumType
    .getValues()
    .map(({ value }) => `'${value}'`)
    .join(", ");

  if (values.length === 0) {
    return "z.never()";
  }

  return `z.enum([${values}])`;
}
