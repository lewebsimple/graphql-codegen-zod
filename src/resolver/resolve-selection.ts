import type {
  FragmentDefinitionNode,
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
 *
 * Unconditional fragment spreads (named and inline) are inlined into the parent
 * selection so that sibling selections sharing a response key can be merged
 * recursively. This matches the GraphQL field-collection rules from §6.3.2 and
 * avoids the shallow `.extend()` collisions that would otherwise drop overlapping
 * sub-selections at parse time.
 *
 * @param input Schema, selection set, and parent output type.
 * @returns Root object node describing the selection.
 */
export function resolveSelection({
  schema,
  selectionSet,
  parentType,
  fragments = new Map<string, FragmentDefinitionNode>(),
}: {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  fragments?: ReadonlyMap<string, FragmentDefinitionNode>;
}): ZodTypeNode {
  // Preserve the existing optimization: when a selection set is exactly one
  // unconditional fragment spread, keep the spread opaque so the renderer can
  // collapse it to a direct `zodFooFragmentSchema` reference (no inlining).
  const shortCircuit = isSingleUnconditionalFragmentSpread({
    schema,
    selectionSet,
    parentType,
    fragments,
  });

  const children = collectChildren({
    schema,
    selectionSet,
    parentType,
    fragments,
    inlineUnconditional: !shortCircuit,
  });

  const merged = shortCircuit ? children : mergeChildrenByResponseKey(children);

  return {
    kind: "object",
    graphqlType: parentType,
    children: merged,
    directives: [],
    capabilities: new Set<Capability>(["type:object", "io:output", "null:rejected"]),
    name: parentType.name,
  };
}

function collectChildren({
  schema,
  selectionSet,
  parentType,
  fragments,
  inlineUnconditional,
}: {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  fragments: ReadonlyMap<string, FragmentDefinitionNode>;
  inlineUnconditional: boolean;
}): ZodTypeNode[] {
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
                fragments,
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
                  fragments,
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
      const fragmentDef = fragments.get(selection.name.value);
      if (!fragmentDef) {
        throw new Error(`Fragment ${selection.name.value} definition not found`);
      }

      const fragmentTypeName = fragmentDef.typeCondition.name.value;
      const fragmentType = schema.getType(fragmentTypeName);
      if (!fragmentType || (!isObjectType(fragmentType) && !isInterfaceType(fragmentType))) {
        throw new Error(
          `Fragment ${selection.name.value} references unsupported type: ${fragmentTypeName}`,
        );
      }

      const conditional = !isTypeSubTypeOf(schema, parentType, fragmentType);

      if (!conditional && inlineUnconditional) {
        // Inline the fragment's selection set so overlapping fields merge with
        // the rest of the parent selection. The renderer never sees a
        // named-fragment node here, which means the parent's Zod schema is built
        // as one flat z.object instead of chained .extend() calls.
        children.push(
          ...collectChildren({
            schema,
            selectionSet: fragmentDef.selectionSet,
            parentType: fragmentType,
            fragments,
            inlineUnconditional: true,
          }),
        );
        continue;
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
        conditional,
      });
      continue;
    }

    const typeCondition = selection.typeCondition?.name.value;
    const parent = typeCondition ? schema.getType(typeCondition) : parentType;
    if (!parent || (!isObjectType(parent) && !isInterfaceType(parent))) {
      throw new Error(`Inline fragment references unsupported type: ${typeCondition}`);
    }

    const conditional = typeCondition ? !isTypeSubTypeOf(schema, parentType, parent) : false;

    if (!conditional && inlineUnconditional) {
      children.push(
        ...collectChildren({
          schema,
          selectionSet: selection.selectionSet,
          parentType: parent,
          fragments,
          inlineUnconditional: true,
        }),
      );
      continue;
    }

    children.push({
      kind: "inline-fragment",
      graphqlType: parent,
      children: resolveSelection({
        schema,
        selectionSet: selection.selectionSet,
        parentType: parent,
        fragments,
      }).children,
      directives: selection.directives ?? [],
      capabilities: new Set<Capability>([
        "type:object",
        "io:output",
        "fragment:inline",
        "null:rejected",
      ]),
      name: typeCondition,
      conditional: true,
    });
  }

  return children;
}

function isSingleUnconditionalFragmentSpread({
  schema,
  selectionSet,
  parentType,
  fragments,
}: {
  schema: GraphQLSchema;
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  fragments: ReadonlyMap<string, FragmentDefinitionNode>;
}): boolean {
  if (selectionSet.selections.length !== 1) {
    return false;
  }

  const only = selectionSet.selections[0];
  if (only.kind !== "FragmentSpread") {
    return false;
  }

  const fragmentDef = fragments.get(only.name.value);
  if (!fragmentDef) {
    return false;
  }

  const fragmentType = schema.getType(fragmentDef.typeCondition.name.value);
  if (!fragmentType || (!isObjectType(fragmentType) && !isInterfaceType(fragmentType))) {
    return false;
  }

  return isTypeSubTypeOf(schema, parentType, fragmentType);
}

/**
 * Merges sibling children that share a response key into a single node,
 * recursively combining their sub-selections. Implements GraphQL §6.3.2
 * field-collection semantics so that two fragments selecting the same nested
 * field don't shadow each other when rendered to Zod.
 *
 * Named-fragment and inline-fragment children (i.e., conditional spreads) are
 * passed through unchanged — they describe partial branches that can't be
 * merged into the unconditional selection.
 */
function mergeChildrenByResponseKey(children: ZodTypeNode[]): ZodTypeNode[] {
  const merged: ZodTypeNode[] = [];
  const indexByResponseKey = new Map<string, number>();

  for (const child of children) {
    if (child.kind === "named-fragment" || child.kind === "inline-fragment" || !child.name) {
      merged.push(child);
      continue;
    }

    const existingIndex = indexByResponseKey.get(child.name);
    if (existingIndex === undefined) {
      indexByResponseKey.set(child.name, merged.length);
      merged.push(child);
      continue;
    }

    merged[existingIndex] = mergeNodePair(merged[existingIndex], child);
  }

  return merged;
}

function mergeNodePair(a: ZodTypeNode, b: ZodTypeNode): ZodTypeNode {
  if (a.kind !== b.kind) {
    throw new Error(
      `Cannot merge selections for response key "${a.name ?? "?"}": ` +
        `kinds differ (${a.kind} vs ${b.kind})`,
    );
  }

  if (a.kind === "object") {
    return {
      ...a,
      children: mergeChildrenByResponseKey([...a.children, ...b.children]),
    };
  }

  if (a.kind === "list") {
    const aChild = a.children[0];
    const bChild = b.children[0];
    if (!aChild || !bChild) {
      return a;
    }
    return {
      ...a,
      children: [mergeNodePair(aChild, bChild)],
    };
  }

  if (a.kind === "union") {
    // Children are one object node per possible type; merge by type name so two
    // selections on the same union field combine their per-type sub-selections.
    return {
      ...a,
      children: mergeChildrenByResponseKey([...a.children, ...b.children]),
    };
  }

  // scalar / enum: GraphQL guarantees both sides resolve to the same type.
  return a;
}
