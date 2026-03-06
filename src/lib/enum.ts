import { GraphQLEnumType, GraphQLSchema, isEnumType } from "graphql";
import { sortBy } from "es-toolkit/array";

export function getEnumTypes(schema: GraphQLSchema): GraphQLEnumType[] {
  const enumTypes = Object.values(schema.getTypeMap()).filter(
    (type): type is GraphQLEnumType => isEnumType(type) && !type.name.startsWith("__"),
  );
  return sortBy(enumTypes, ["name"]);
}

export function getEnumType(schema: GraphQLSchema, enumName: string): GraphQLEnumType | null {
  const type = schema.getType(enumName);
  return isEnumType(type) ? type : null;
}

export function getEnumSchemaExpression(enumType: GraphQLEnumType): string {
  const values = enumType
    .getValues()
    .map(({ value }) => `'${value}'`)
    .join(", ");

  if (values.length === 0) {
    return "z.never()";
  }

  return `z.enum([${values}])`;
}
