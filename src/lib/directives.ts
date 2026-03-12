import type { DirectiveNode } from "graphql";

import type { ZodOutputState } from "./selection";
import type { ZodInputState } from "./variables";

// ────────────────────────────────────────────────────────────────────────────
// Input directive helpers
// ────────────────────────────────────────────────────────────────────────────

/** Function type for input directive hooks. */
export type InputDirectiveHook = (state: ZodInputState, directive: DirectiveNode) => ZodInputState;

/**
 * Factory to create input directive hooks, matching on directive name and applying the provided transformation function.
 *
 * @param name Directive name to match.
 * @param apply Transformation function that takes the current state and directive, returning the modified state.
 * @returns InputDirectiveHook function that can be used in the input directive hooks registry.
 */
function createInputDirective(
  name: string,
  apply: (state: ZodInputState, directive: DirectiveNode) => ZodInputState,
): InputDirectiveHook {
  return (state, directive) => {
    if (directive.name.value !== name) {
      return state;
    }
    return apply(state, directive);
  };
}

/** Input directive hooks registry. */
const inputDirectiveHooks: Record<string, InputDirectiveHook> = {
  required: createInputDirective("required", (state) => ({ ...state, nullable: false })),
};

/**
 * Applies input directives to the Zod input state, modifying the schema as needed.
 *
 * @param state Current Zod input state.
 * @param directives List of GraphQL directives to apply.
 * @returns Modified Zod input state after applying directives.
 */
export function applyInputDirectives(state: ZodInputState, directives: readonly DirectiveNode[]) {
  let nextState = state;

  for (const directive of directives) {
    const hook = inputDirectiveHooks[directive.name.value];
    if (!hook) {
      continue;
    }
    nextState = hook(nextState, directive);
  }

  return nextState;
}

// ────────────────────────────────────────────────────────────────────────────
// Output directives
// ────────────────────────────────────────────────────────────────────────────

/** Function type for output directive hooks. */
export type OutputDirectiveHook = (
  state: ZodOutputState,
  directive: DirectiveNode,
) => ZodOutputState;

/**
 * Factory to create output directive hooks, matching on directive name and applying the provided transformation function.
 *
 * @param name Directive name to match.
 * @param apply Transformation function that takes the current state and directive, returning the modified state.
 * @returns OutputDirectiveHook function that can be used in the output directive hooks registry.
 */
function createOutputDirective(
  name: string,
  apply: (state: ZodOutputState, directive: DirectiveNode) => ZodOutputState,
): OutputDirectiveHook {
  return (state, directive) => {
    if (directive.name.value !== name) {
      return state;
    }
    return apply(state, directive);
  };
}

/** Output directive hooks registry. */
const outputDirectiveHooks: Record<string, OutputDirectiveHook> = {
  // @required
  required: createOutputDirective("required", (state) => ({ ...state, nullable: false })),
};

/**
 * Applies output directives to the Zod output state, modifying the schema as needed.
 *
 * @param state Current Zod output state.
 * @param directives List of GraphQL directives to apply.
 * @returns Modified Zod output state after applying directives.
 */
export function applyOutputDirectives(state: ZodOutputState, directives: readonly DirectiveNode[]) {
  let nextState = state;

  for (const directive of directives) {
    const hook = outputDirectiveHooks[directive.name.value];
    if (!hook) {
      continue;
    }
    nextState = hook(nextState, directive);
  }

  return nextState;
}
