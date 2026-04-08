import type {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  SelectionSetNode,
} from "graphql";
import { isInterfaceType, isObjectType, isTypeSubTypeOf, isUnionType } from "graphql";

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
  fragmentTypeConditions = new Map<string, string>(),
}: {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  fragmentTypeConditions?: ReadonlyMap<string, string>;
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

      if (selection.selectionSet) {
        let currentNode = resolved;

        while (currentNode.kind === "list") {
          const child = currentNode.children[0];
          if (!child) {
            throw new Error("List node is missing a child type");
          }
          currentNode = child;
        }

        if (currentNode.kind === "object") {
          const named = schema.getType(currentNode.name ?? "");
          if (named && (isObjectType(named) || isInterfaceType(named))) {
            currentNode.children.push(
              ...resolveSelection({
                schema,
                selectionSet: selection.selectionSet,
                parentType: named,
                fragmentTypeConditions,
              }).children,
            );
          }
        }

        if (currentNode.kind === "union") {
          const named = schema.getType(currentNode.name ?? "");
          if (named && isUnionType(named)) {
            for (const possibleType of named.getTypes()) {
              currentNode.children.push(
                resolveSelection({
                  schema,
                  selectionSet: selection.selectionSet,
                  parentType: possibleType,
                  fragmentTypeConditions,
                }),
              );
            }
          }
        }
      }

      children.push({ ...resolved, name: selection.alias?.value ?? fieldName });
      continue;
    }

    if (selection.kind === "FragmentSpread") {
      const typeCondition = fragmentTypeConditions.get(selection.name.value);
      if (!typeCondition) {
        throw new Error(`Fragment ${selection.name.value} type condition not found`);
      }

      const fragmentType = schema.getType(typeCondition);
      if (!fragmentType || (!isObjectType(fragmentType) && !isInterfaceType(fragmentType))) {
        throw new Error(
          `Fragment ${selection.name.value} references unsupported type: ${typeCondition}`,
        );
      }

      children.push({
        kind: "named-fragment",
        graphqlType: fragmentType,
        children: [],
        directives: [],
        capabilities: new Set<Capability>([
          "type:object",
          "io:output",
          "fragment:named",
          "null:rejected",
        ]),
        name: selection.name.value,
        conditional: !isTypeSubTypeOf(schema, parentType, fragmentType),
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
        fragmentTypeConditions,
      }).children,
      directives: selection.directives ?? [],
      capabilities: new Set<Capability>([
        "type:object",
        "io:output",
        "fragment:inline",
        "null:rejected",
      ]),
      name: typeCondition,
      conditional: typeCondition ? !isTypeSubTypeOf(schema, parentType, parent) : false,
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
