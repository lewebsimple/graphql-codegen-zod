import type {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  InlineFragmentNode,
  SelectionSetNode,
} from "graphql";
import {
  getNamedType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql";

import type { DepIdentifier } from "./deps";
import { getDepSchemaIdentifier } from "./deps";
import { getZodScalar } from "./zod";

export type ZodFromSelectionInput = {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  deps: Set<DepIdentifier>;
};

/**
 * Builds a Zod schema expression for a selection set and tracks dependencies.
 * @param schema GraphQL schema for type lookups.
 * @param selectionSet AST selection set to convert.
 * @param parentType Parent object/interface for field resolution.
 * @returns Schema expression plus fragment/enum dependencies.
 */
export function getZodSelection({
  schema,
  selectionSet,
  parentType,
  deps,
}: ZodFromSelectionInput): string {
  const fields: string[] = [];
  const merges: string[] = [];

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case "Field": {
        const fieldName = selection.name.value;
        const fieldAlias = selection.alias?.value ?? fieldName;

        if (fieldName === "__typename") {
          const typenameSchema = isObjectType(parentType)
            ? `z.literal('${parentType.name}')`
            : "z.string()";
          fields.push(`${fieldAlias}: ${typenameSchema}`);
          break;
        }

        const fieldDef = parentType.getFields()[fieldName];
        if (!fieldDef) {
          throw new Error(`Field ${fieldName} not found on type ${parentType.name}`);
        }

        const zodField = getZodOutput({
          schema,
          outputType: fieldDef.type,
          selectionSet: selection.selectionSet,
          deps,
        });
        fields.push(`${fieldAlias}: ${zodField}`);
        break;
      }

      case "FragmentSpread":
        deps.add({ name: selection.name.value, kind: "fragment" });
        merges.push(getDepSchemaIdentifier({ name: selection.name.value, kind: "fragment" }));
        break;

      case "InlineFragment": {
        const inlineParentType = resolveInlineFragmentParentType({
          schema,
          parentType,
          inlineFragment: selection,
        });
        const inlineSchema = getZodSelection({
          schema,
          selectionSet: selection.selectionSet,
          parentType: inlineParentType,
          deps,
        });
        merges.push(inlineSchema);
        break;
      }
    }
  }

  let baseSchema = `z.object({ ${fields.join(", ")} })`;
  for (const mergedSchema of merges) {
    baseSchema += `.extend((${mergedSchema}).shape)`;
  }

  return baseSchema;
}

type ZodFromOutputInput = {
  schema: GraphQLSchema;
  outputType: GraphQLOutputType;
  selectionSet?: SelectionSetNode;
  deps: Set<DepIdentifier>;
};

/**
 * Converts a GraphQLOutputType to a Zod schema expression, tracking enum/fragment dependencies.
 * @param outputType GraphQL output type.
 * @param selectionSet Optional child selection set for object/interface output types.
 * @returns Zod schema expression.
 */
function getZodOutput({ schema, outputType, selectionSet, deps }: ZodFromOutputInput): string {
  let nullable = true;

  if (isNonNullType(outputType)) {
    outputType = outputType.ofType;
    nullable = false;
  }

  let zodSchema: string;

  if (isListType(outputType)) {
    zodSchema = `z.array(${getZodOutput({ schema, outputType: outputType.ofType, selectionSet, deps })})`;
  } else {
    const named = getNamedType(outputType);

    if (isScalarType(named)) {
      // Scalar
      zodSchema = getZodScalar(named.name);
    } else if (isEnumType(named)) {
      // Enum
      deps.add({ name: named.name, kind: "enum" });
      zodSchema = getDepSchemaIdentifier({ name: named.name, kind: "enum" });
    } else if (isObjectType(named) || isInterfaceType(named)) {
      // Nested selection set
      if (!selectionSet) {
        throw new Error(`Field of type ${named.name} requires a selection set`);
      }
      zodSchema = getZodSelection({ schema, selectionSet, parentType: named, deps });
    } else if (isUnionType(named)) {
      // Union
      if (!selectionSet) {
        throw new Error(`Field of union type ${named.name} requires a selection set`);
      }

      const possibleSchemas = named
        .getTypes()
        .map((possibleType) =>
          getZodSelection({ schema, selectionSet, parentType: possibleType, deps }),
        );
      zodSchema =
        possibleSchemas.length === 1
          ? possibleSchemas[0]
          : `z.union([${possibleSchemas.join(", ")}])`;
    } else {
      zodSchema = "z.unknown()";
    }
  }

  if (nullable) {
    zodSchema += ".nullable()";
  }

  return zodSchema;
}

type ResolveInlineFragmentParentTypeInput = {
  schema: GraphQLSchema;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  inlineFragment: InlineFragmentNode;
};

/**
 * Resolves the parent type for an inline fragment.
 * @param parentType Current parent type.
 * @param inlineFragment Inline fragment AST node.
 * @returns Resolved object/interface type.
 */
function resolveInlineFragmentParentType({
  schema,
  parentType,
  inlineFragment,
}: ResolveInlineFragmentParentTypeInput): GraphQLObjectType | GraphQLInterfaceType {
  const typeConditionName = inlineFragment.typeCondition?.name.value;
  if (!typeConditionName) {
    return parentType;
  }

  const typeCondition = schema.getType(typeConditionName);
  if (!typeCondition || (!isObjectType(typeCondition) && !isInterfaceType(typeCondition))) {
    throw new Error(`Inline fragment references unsupported type: ${typeConditionName}`);
  }

  return typeCondition;
}
