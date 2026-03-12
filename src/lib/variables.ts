import type {
  DirectiveNode,
  GraphQLInputType,
  GraphQLSchema,
  TypeNode,
  VariableDefinitionNode,
} from "graphql";
import {
  GraphQLList,
  GraphQLNonNull,
  Kind,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  valueFromASTUntyped,
} from "graphql";

import type { DepIdentifier } from "./deps";
import { applyInputDirectives } from "./directives";
import { getEnumType } from "./enum";
import { getZodEnum, getZodScalar, type ZodSchemaState } from "./zod";

/** Input/variables schema builder state. */
export type ZodInputState = ZodSchemaState & {
  inputType: GraphQLInputType;
};

export type ZodFromVariablesInput = {
  schema: GraphQLSchema;
  variablesDef?: readonly VariableDefinitionNode[];
  deps: Set<DepIdentifier>;
};
/**
 * Get Zod schema and dependencies from operation variables definition.
 * @param operationDef Operation definition AST node.
 * @returns Zod expression plus enum dependencies.
 */
export function getZodVariables({ schema, variablesDef, deps }: ZodFromVariablesInput): string {
  // If no variables, return empty object schema with optional/default to allow omission
  if (!variablesDef?.length) {
    return "z.object({}).optional().default({})";
  }

  // Convert each variable definition to a Zod schema field, tracking enum dependencies
  const fields = variablesDef.map((variableDef) => {
    const inputType = resolveInputType(schema, variableDef.type);
    const variableName = variableDef.variable.name.value;
    const defaultValue = variableDef.defaultValue
      ? valueFromASTUntyped(variableDef.defaultValue)
      : undefined;
    const zodInput = getZodInput({
      schema,
      inputType,
      directives: variableDef.directives ?? [],
      deps,
      defaultValue,
    });
    return `${variableName}: ${zodInput}`;
  });

  return `z.object({ ${fields.join(", ")} })`;
}

/**
 * Converts a GraphQL TypeNode to a GraphQLInputType.
 * @param schema GraphQL schema.
 * @param node TypeNode to convert.
 * @returns Corresponding GraphQLInputType.
 */
function resolveInputType(schema: GraphQLSchema, node: TypeNode): GraphQLInputType {
  switch (node.kind) {
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveInputType(schema, node.type));

    case Kind.LIST_TYPE:
      return new GraphQLList(resolveInputType(schema, node.type));

    default:
      const named = schema.getType(node.name.value);
      if (!named) {
        throw new Error(`Unknown type ${node.name.value}`);
      }
      return named as GraphQLInputType;
  }
}

export type ZodFromInput = {
  schema: GraphQLSchema;
  inputType: GraphQLInputType;
  directives?: readonly DirectiveNode[];
  deps: Set<DepIdentifier>;
  defaultValue?: unknown;
  allowUndefined?: boolean;
};

/**
 * Converts a GraphQLInputType to a Zod schema expression, tracking enum dependencies.
 * @param inputType GraphQL input type.
 * @param enumDeps Set to track enum dependencies.
 * @param defaultValue Default value for the field.
 * @param allowUndefined Whether to allow undefined values.
 * @returns Zod schema expression.
 */
const getZodInput = ({
  schema,
  inputType,
  directives,
  deps,
  defaultValue,
  allowUndefined = true,
}: ZodFromInput): string => {
  let state: ZodInputState = {
    inputType,
    zodSchema: "",
    nullable: true,
    optional: allowUndefined,
    defaultValue,
    transforms: [],
  };

  // Unwrap non-null types
  if (isNonNullType(state.inputType)) {
    state.inputType = state.inputType.ofType;
    state.nullable = false;
    state.optional = false;
  }

  if (isListType(state.inputType)) {
    state.zodSchema = `z.array(${getZodInput({ schema, inputType: state.inputType.ofType, deps, defaultValue: undefined, allowUndefined: false })})`;
  } else {
    const named = getNamedType(state.inputType);

    if (isScalarType(named)) {
      // Scalar
      state.zodSchema = getZodScalar(named.name);
    } else if (isEnumType(named)) {
      // Enum
      const enumType = getEnumType(schema, named.name);
      if (!enumType) {
        throw new Error(`Enum type ${named.name} not found in schema`);
      }
      deps.add({ name: named.name, kind: "enum" });
      state.zodSchema = getZodEnum(enumType);
    } else if (isInputObjectType(named)) {
      // Nested input object
      const fields = Object.values(named.getFields()).map((field) => {
        const fieldExpr = getZodInput({
          schema,
          inputType: field.type,
          deps,
          defaultValue: field.defaultValue,
        });
        return `${field.name}: ${fieldExpr}`;
      });
      state.zodSchema = `z.object({${fields.join(", ")}})`;
    } else {
      state.zodSchema = "z.unknown()";
    }
  }

  state = applyInputDirectives(state, directives ?? []);

  if (state.nullable) {
    state.zodSchema += ".nullable()";
  }

  if (state.optional) {
    state.zodSchema += ".optional()";
  }

  if (state.defaultValue !== undefined) {
    state.zodSchema += `.default(${JSON.stringify(state.defaultValue)})`;
  }

  for (const transform of state.transforms) {
    state.zodSchema += transform;
  }

  return state.zodSchema;
};
