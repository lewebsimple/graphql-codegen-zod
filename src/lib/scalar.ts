export function getScalarSchemaExpression(scalarName: string): string {
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
