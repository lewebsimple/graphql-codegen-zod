import { Kind, valueFromASTUntyped, type DirectiveLocation, type DirectiveNode } from "graphql";

import type { Capability, CapabilityTransition } from "../core/capabilities";
import type { ZodTypeNode } from "../core/zod-type-node";
import type { ZodTypeState } from "../core/zod-type-state";

import type { PipelineStageName } from "./stages";

/** Directive argument metadata used for SDL generation. */
export type DirectiveArg = {
  /** Argument name. */
  name: string;
  /** SDL type for the argument. */
  typeSDL: string;
};

/** Directive implementation contract used by the pipeline. */
export type DirectiveDefinition = CapabilityTransition & {
  /** Directive name without the `@` prefix. */
  name: string;
  /** Pipeline stage where the directive runs. */
  stage: PipelineStageName;
  /** Capabilities required before the directive may run. */
  requires: readonly Capability[];
  /** GraphQL locations where the directive may appear. */
  locations: readonly DirectiveLocation[];
  /** Optional SDL argument metadata. */
  args?: readonly DirectiveArg[];
  /** Directive transformation implementation. */
  apply: (input: {
    /** Current pipeline state. */
    state: ZodTypeState;
    /** Resolver node the directive applies to. */
    node: ZodTypeNode;
    /** Source directive AST node. */
    directive: DirectiveNode;
  }) => ZodTypeState;
};

/** Registry of supported directives keyed by directive name. */
export type DirectiveRegistry = Record<string, DirectiveDefinition>;

export const directiveSupportSDL = [
  "scalar ZodValue",
  "enum ZodDirectiveTarget { SELF ITEMS SELF_AND_ITEMS }",
] as const;

export const targetArg: DirectiveArg = {
  name: "target",
  typeSDL: "ZodDirectiveTarget! = SELF",
};

export const valueArg: DirectiveArg = {
  name: "value",
  typeSDL: "ZodValue!",
};

export const directiveTargetValues = ["SELF", "ITEMS", "SELF_AND_ITEMS"] as const;

export type DirectiveTarget = (typeof directiveTargetValues)[number];

const targetedDirectiveSupport = {
  nonNull: new Set<DirectiveTarget>(["SELF", "ITEMS", "SELF_AND_ITEMS"]),
  nullTo: new Set<DirectiveTarget>(["SELF", "ITEMS"]),
};

/**
 * Reads a directive argument as a literal executable value.
 *
 * @param directive Source directive node.
 * @param argName Name of the argument to read.
 * @returns Parsed literal value, or `undefined` when the argument is absent.
 */
export function getLiteralDirectiveArgumentValue(
  directive: DirectiveNode,
  argName: string,
): unknown {
  const argument = directive.arguments?.find((entry) => entry.name.value === argName);
  if (!argument) {
    return undefined;
  }

  if (argument.value.kind === Kind.VARIABLE) {
    throw new Error(`Directive @${directive.name.value} argument "${argName}" must be a literal`);
  }

  return valueFromASTUntyped(argument.value);
}

/**
 * Splits directives between a node and its immediate list item type.
 *
 * @param input Directives plus whether the current node is a list.
 * @returns Directives for the current node and the immediate child item node.
 */
export function splitTargetedDirectives({
  directives,
  isListType,
}: {
  directives: readonly DirectiveNode[];
  isListType: boolean;
}): { selfDirectives: DirectiveNode[]; itemDirectives: DirectiveNode[] } {
  const selfDirectives: DirectiveNode[] = [];
  const itemDirectives: DirectiveNode[] = [];

  for (const directive of directives) {
    const target = getDirectiveTarget(directive);
    const normalizedDirective = stripTargetArgument(directive);

    if (target === "SELF") {
      selfDirectives.push(normalizedDirective);
      continue;
    }

    if (!isListType) {
      throw new Error(`Directive @${directive.name.value} target ${target} requires a list type`);
    }

    if (target === "ITEMS") {
      itemDirectives.push(normalizedDirective);
      continue;
    }

    selfDirectives.push(normalizedDirective);
    itemDirectives.push(normalizedDirective);
  }

  return { selfDirectives, itemDirectives };
}

/**
 * Wraps the current schema so it still accepts `null` before a transform runs.
 *
 * @param state Current pipeline state.
 * @param transform Transform suffix to append after rendering.
 * @returns Updated state with a nullable pre-transform schema.
 */
export function withNullableTransform(state: ZodTypeState, transform: string): ZodTypeState {
  return {
    ...state,
    schema: `${state.schema}.nullable()`,
    transforms: [...state.transforms, transform],
  };
}

function getDirectiveTarget(directive: DirectiveNode): DirectiveTarget {
  const allowedTargets =
    targetedDirectiveSupport[directive.name.value as keyof typeof targetedDirectiveSupport];
  if (!allowedTargets) {
    return "SELF";
  }

  const targetValue = getLiteralDirectiveArgumentValue(directive, "target");
  if (targetValue === undefined) {
    return "SELF";
  }

  if (
    typeof targetValue !== "string" ||
    !(directiveTargetValues as readonly string[]).includes(targetValue)
  ) {
    throw new Error(
      `Directive @${directive.name.value} has an unsupported "target" value: ${JSON.stringify(targetValue)}`,
    );
  }

  const target = targetValue as DirectiveTarget;
  if (!allowedTargets.has(target)) {
    throw new Error(`Directive @${directive.name.value} does not support target ${target}`);
  }

  return target;
}

function stripTargetArgument(directive: DirectiveNode): DirectiveNode {
  const filteredArguments = directive.arguments?.filter(
    (argument) => argument.name.value !== "target",
  );
  if ((directive.arguments?.length ?? 0) === (filteredArguments?.length ?? 0)) {
    return directive;
  }

  return {
    ...directive,
    arguments: filteredArguments,
  };
}
