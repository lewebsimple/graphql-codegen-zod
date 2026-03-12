import { DirectiveLocation, type DirectiveNode } from "graphql";

import type { ZodOutputState } from "./selection";
import type { ZodInputState } from "./variables";

// ────────────────────────────────────────────────────────────────────────────
// Directive types
// ────────────────────────────────────────────────────────────────────────────

/** Argument for a Zod directive. */
export type ZodDirectiveArg = {
  name: string;
  typeSDL: string;
};

/** Definition for a Zod directive applied to input types. */
export type ZodDirectiveInputDefinition = {
  locations: readonly DirectiveLocation[];
  apply: (state: ZodInputState, directive: DirectiveNode) => ZodInputState;
};

/** Definition for a Zod directive applied to output types. */
export type ZodDirectiveOutputDefinition = {
  locations: readonly DirectiveLocation[];
  apply: (state: ZodOutputState, directive: DirectiveNode) => ZodOutputState;
};

/** Definition for a Zod directive. */
export type ZodDirectiveDefinition = {
  description?: string;
  args?: readonly ZodDirectiveArg[];
  input?: ZodDirectiveInputDefinition;
  output?: ZodDirectiveOutputDefinition;
};

/** Directive registry */
export type ZodDirectiveRegistry = Record<string, ZodDirectiveDefinition>;

// ────────────────────────────────────────────────────────────────────────────
// Directive application
// ────────────────────────────────────────────────────────────────────────────

/**
 * Applies input directives to the Zod input state.
 *
 * @param state Current Zod input state.
 * @param directives List of GraphQL directives to apply.
 * @returns Modified Zod input state after applying directives.
 */
export function applyInputDirectives(state: ZodInputState, directives: readonly DirectiveNode[]) {
  let nextState = state;

  for (const directive of directives) {
    const definition = zodDirectiveRegistry[directive.name.value];
    if (!definition?.input) {
      continue;
    }
    nextState = definition.input.apply(nextState, directive);
  }

  return nextState;
}

/**
 * Applies output directives to the Zod output state.
 *
 * @param state Current Zod output state.
 * @param directives List of GraphQL directives to apply.
 * @returns Modified Zod output state after applying directives.
 */
export function applyOutputDirectives(state: ZodOutputState, directives: readonly DirectiveNode[]) {
  let nextState = state;

  for (const directive of directives) {
    const definition = zodDirectiveRegistry[directive.name.value];
    if (!definition?.output) {
      continue;
    }
    nextState = definition.output.apply(nextState, directive);
  }

  return nextState;
}

// ────────────────────────────────────────────────────────────────────────────
// Directive registry
// ────────────────────────────────────────────────────────────────────────────

export const zodDirectiveRegistry: ZodDirectiveRegistry = {
  required: {
    input: {
      locations: [DirectiveLocation.VARIABLE_DEFINITION],
      apply: (state) => ({ ...state, nullable: false }),
    },
    output: {
      locations: [DirectiveLocation.FIELD],
      apply: (state) => ({ ...state, nullable: false }),
    },
  },
};
