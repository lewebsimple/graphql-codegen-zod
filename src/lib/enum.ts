import { GraphQLEnumType, GraphQLSchema, isEnumType } from "graphql";
import { sortBy } from "es-toolkit/array";

export type EnumDescriptor = { kind: "enum"; enumName: string };

export function getEnumTypes(schema: GraphQLSchema): GraphQLEnumType[] {
  const enumTypes = Object.values(schema.getTypeMap()).filter(
    (type): type is GraphQLEnumType => isEnumType(type) && !type.name.startsWith("__"),
  );
  return sortBy(enumTypes, ["name"]);
}

export const getEnumValuesExpression = (enumType: GraphQLEnumType): string => {
  const values = enumType
    .getValues()
    .map(({ value }) => `'${value}'`)
    .join(", ");

  if (values.length === 0) {
    return "z.never()";
  }

  return `z.enum([${values}])`;
};
