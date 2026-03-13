import type {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  SelectionSetNode,
} from "graphql";
import { isInterfaceType, isObjectType, isUnionType } from "graphql";

import type { Capability } from "../core/capabilities";
import type { ZodTypeNode } from "../core/zod-type-node";

import { resolveTypeNode } from "./resolve-type-node";

/**
 * Resolves a selection set into a tree of renderable resolver nodes.

 * @param input Schema, selection set, and parent output type.
 * @returns Root object node describing the selection.
 */
export function resolveSelection({
  schema,
  selectionSet,
  parentType,
}: {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
}): ZodTypeNode {
  const children: ZodTypeNode[] = [];

  for (const selection of selectionSet.selections) {
    if (selection.kind === "Field") {
      const fieldName = selection.name.value;
      if (fieldName === "__typename") {
        children.push({
          kind: "scalar",
          graphqlType: parentType,
          children: [],
          directives: selection.directives ?? [],
          capabilities: new Set<Capability>(["type:scalar", "io:output", "null:rejected"]),
          name: "__typename",
        });
        continue;
      }

      const fieldDef = parentType.getFields()[fieldName];
      if (!fieldDef) {
        throw new Error(`Field ${fieldName} not found on type ${parentType.name}`);
      }

      const resolved = resolveTypeNode({
        graphqlType: fieldDef.type,
        directives: selection.directives ?? [],
        ioType: "output",
      }).node;

      if (selection.selectionSet && resolved.kind === "object") {
        const named = schema.getType(resolved.name ?? "");
        if (named && (isObjectType(named) || isInterfaceType(named))) {
          resolved.children.push(
            ...resolveSelection({ schema, selectionSet: selection.selectionSet, parentType: named })
              .children,
          );
        }
      }

      if (selection.selectionSet && resolved.kind === "union") {
        const named = schema.getType(resolved.name ?? "");
        if (named && isUnionType(named)) {
          for (const possibleType of named.getTypes()) {
            resolved.children.push(
              resolveSelection({
                schema,
                selectionSet: selection.selectionSet,
                parentType: possibleType,
              }),
            );
          }
        }
      }

      children.push({ ...resolved, name: selection.alias?.value ?? fieldName });
      continue;
    }

    if (selection.kind === "FragmentSpread") {
      children.push({
        kind: "named-fragment",
        graphqlType: parentType,
        children: [],
        directives: [],
        capabilities: new Set<Capability>([
          "type:object",
          "io:output",
          "fragment:named",
          "null:rejected",
        ]),
        name: selection.name.value,
      });
      continue;
    }

    const typeCondition = selection.typeCondition?.name.value;
    const parent = typeCondition ? schema.getType(typeCondition) : parentType;
    if (!parent || (!isObjectType(parent) && !isInterfaceType(parent))) {
      throw new Error(`Inline fragment references unsupported type: ${typeCondition}`);
    }

    children.push({
      kind: "inline-fragment",
      graphqlType: parent,
      children: resolveSelection({
        schema,
        selectionSet: selection.selectionSet,
        parentType: parent,
      }).children,
      directives: selection.directives ?? [],
      capabilities: new Set<Capability>([
        "type:object",
        "io:output",
        "fragment:inline",
        "null:rejected",
      ]),
      name: typeCondition,
    });
  }

  return {
    kind: "object",
    graphqlType: parentType,
    children,
    directives: [],
    capabilities: new Set<Capability>(["type:object", "io:output", "null:rejected"]),
    name: parentType.name,
  };
}
