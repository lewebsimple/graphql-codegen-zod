import type { GraphQLSchema } from "graphql";
import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isObjectType,
  isScalarType,
  isSchema,
} from "graphql";

import type { DepIdentifier } from "../core/deps";
import type { ZodTypeNode } from "../core/ZodTypeNode";
import { createInitialZodTypeState } from "../core/ZodTypeState";
import { directiveRegistry } from "../directives/index";
import { executePipeline } from "../pipeline/execute";
import { resolveTypeNode } from "../resolver/resolveTypeNode";

import { getDepSchemaIdentifier } from "./deps";

/**
 * Renders a resolver node tree into a Zod schema expression.

 * @param input Node tree, schema, and dependency collector.
 * @returns Rendered Zod schema expression.
 */
export function renderNodeToSchema({
  node,
  schema,
  deps,
}: {
  node: ZodTypeNode;
  schema: GraphQLSchema;
  deps: Set<DepIdentifier>;
}): string {
  return renderNode({ node, schema, deps, allowOptional: false });
}

/**
 * Renders an enum node as a literal `z.enum(...)` expression.

 * @param node Resolver node backed by a GraphQL enum.
 * @returns Literal enum schema expression.
 */
export function renderEnumValuesSchema(node: ZodTypeNode): string {
  if (isSchema(node.graphqlType)) {
    throw new Error("Enum node cannot be backed by a GraphQL schema instance");
  }

  const named = getNamedType(node.graphqlType);
  if (!isEnumType(named)) {
    throw new Error("Node is not backed by a GraphQL enum type");
  }

  const values = named
    .getValues()
    .map(({ value }) => `'${value}'`)
    .join(", ");

  if (values.length === 0) {
    return "z.never()";
  }

  return `z.enum([${values}])`;
}

/**
 * Renders a single resolver node.

 * @param input Render context for the node.
 * @returns Rendered Zod schema expression.
 */
function renderNode({
  node,
  schema,
  deps,
  allowOptional,
}: {
  node: ZodTypeNode;
  schema: GraphQLSchema;
  deps: Set<DepIdentifier>;
  allowOptional: boolean;
}): string {
  if (node.kind === "named-fragment") {
    deps.add({ name: node.name ?? "", kind: "fragment" });
    return getDepSchemaIdentifier({ name: node.name ?? "", kind: "fragment" });
  }

  let baseSchema = "z.unknown()";

  switch (node.kind) {
    case "scalar":
      baseSchema = renderScalar(node);
      break;

    case "enum": {
      if (!isSchema(node.graphqlType)) {
        const named = getNamedType(node.graphqlType);
        if (isEnumType(named)) {
          deps.add({ name: named.name, kind: "enum" });
          baseSchema = getDepSchemaIdentifier({ name: named.name, kind: "enum" });
        }
      }
      break;
    }

    case "list": {
      const child = node.children[0];
      if (!child) {
        throw new Error("List node is missing a child type");
      }

      baseSchema = `z.array(${renderNode({ node: child, schema, deps, allowOptional: false })})`;
      break;
    }

    case "union": {
      const schemas = node.children.map((child) =>
        renderNode({ node: child, schema, deps, allowOptional: false }),
      );

      if (schemas.length === 0) {
        baseSchema = "z.unknown()";
      } else if (schemas.length === 1) {
        baseSchema = schemas[0];
      } else {
        baseSchema = `z.union([${schemas.join(", ")}])`;
      }

      break;
    }

    case "object":
    case "inline-fragment":
      baseSchema = renderObjectLike(node, schema, deps);
      break;
  }

  return applyPipeline({ node, baseSchema, deps, allowOptional });
}

/**
 * Renders either an input or output object-like node.

 * @param node Object-like resolver node.
 * @param schema GraphQL schema used for nested type resolution.
 * @param deps Dependency collector.
 * @returns Rendered object schema expression.
 */
function renderObjectLike(
  node: ZodTypeNode,
  schema: GraphQLSchema,
  deps: Set<DepIdentifier>,
): string {
  if (node.capabilities.has("output")) {
    return renderOutputObject(node, schema, deps);
  }

  return renderInputObject(node, schema, deps);
}

/**
 * Renders an output object selection.

 * @param node Output object resolver node.
 * @param schema GraphQL schema used for nested rendering.
 * @param deps Dependency collector.
 * @returns Rendered output object schema expression.
 */
function renderOutputObject(
  node: ZodTypeNode,
  schema: GraphQLSchema,
  deps: Set<DepIdentifier>,
): string {
  const fields: string[] = [];
  const merges: string[] = [];

  for (const child of node.children) {
    if (child.kind === "named-fragment") {
      merges.push(renderNode({ node: child, schema, deps, allowOptional: false }));
      continue;
    }

    if (child.kind === "inline-fragment") {
      merges.push(renderNode({ node: child, schema, deps, allowOptional: false }));
      continue;
    }

    if (!child.name) {
      throw new Error("Output field node is missing a field name");
    }

    const fieldSchema = renderNode({ node: child, schema, deps, allowOptional: false });
    fields.push(`${child.name}: ${fieldSchema}`);
  }

  let baseSchema = `z.object({ ${fields.join(", ")} })`;
  if (fields.length === 0 && merges.length === 1) {
    return merges[0];
  }

  for (const mergeSchema of merges) {
    baseSchema += `.extend((${mergeSchema}).shape)`;
  }

  return baseSchema;
}

/**
 * Renders an input object and its fields.

 * @param node Input object resolver node.
 * @param schema GraphQL schema used for nested type lookup.
 * @param deps Dependency collector.
 * @returns Rendered input object schema expression.
 */
function renderInputObject(
  node: ZodTypeNode,
  schema: GraphQLSchema,
  deps: Set<DepIdentifier>,
): string {
  const fields = node.children.length > 0 ? node.children : getInputObjectChildren(node);

  const schemaFields = fields.map((child) => {
    if (!child.name) {
      throw new Error("Input field node is missing a field name");
    }

    const fieldSchema = renderNode({ node: child, schema, deps, allowOptional: true });
    return `${child.name}: ${fieldSchema}`;
  });

  return `z.object({ ${schemaFields.join(", ")} })`;
}

/**
 * Synthesizes child nodes for GraphQL input object fields.

 * @param node Input object node to expand.
 * @returns Child nodes representing input fields.
 */
function getInputObjectChildren(node: ZodTypeNode): ZodTypeNode[] {
  if (isSchema(node.graphqlType)) {
    return [];
  }

  const named = getNamedType(node.graphqlType);
  if (!isInputObjectType(named)) {
    return [];
  }

  return Object.values(named.getFields()).map((field) => {
    const resolved = resolveTypeNode({
      graphqlType: field.type,
      directives: field.astNode?.directives ?? [],
      ioType: "input",
    }).node;

    return {
      ...resolved,
      name: field.name,
      defaultValue: field.defaultValue,
    };
  });
}

/**
 * Renders a scalar-like node into a Zod expression.

 * @param node Scalar resolver node.
 * @returns Rendered scalar schema expression.
 */
function renderScalar(node: ZodTypeNode): string {
  if (node.name === "__typename") {
    return isObjectType(node.graphqlType) ? `z.literal('${node.graphqlType.name}')` : "z.string()";
  }

  if (isSchema(node.graphqlType)) {
    return "z.unknown()";
  }

  const named = getNamedType(node.graphqlType);
  if (!isScalarType(named)) {
    return "z.unknown()";
  }

  switch (named.name) {
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
 * Applies pipeline effects to a rendered node schema.

 * @param input Node, base schema, dependencies, and optionality flag.
 * @returns Final schema expression after pipeline execution.
 */
function applyPipeline({
  node,
  baseSchema,
  deps,
  allowOptional,
}: {
  node: ZodTypeNode;
  baseSchema: string;
  deps: Set<DepIdentifier>;
  allowOptional: boolean;
}): string {
  const ioType = node.capabilities.has("input") ? "input" : "output";

  const state = createInitialZodTypeState(ioType);
  state.schema = baseSchema;
  state.nullable = node.capabilities.has("nullable");
  state.optional = ioType === "input" && allowOptional;
  state.defaultValue = node.defaultValue;
  state.deps = deps;
  state.capabilities = node.capabilities;
  state.directives = directiveRegistry;

  return executePipeline({ node, state }).schema;
}

/**
 * Checks whether a resolver node is backed by a GraphQL enum.

 * @param node Resolver node to inspect.
 * @returns `true` when the node can be rendered as an enum.
 */
export function isRenderableEnumNode(node: ZodTypeNode): boolean {
  if (isSchema(node.graphqlType)) {
    return false;
  }

  return isEnumType(getNamedType(node.graphqlType));
}
