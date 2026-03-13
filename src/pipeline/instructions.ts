import type { DirectiveNode } from "graphql";

import { hasCapabilities, type Capability } from "../core/capabilities";
import type { ZodTypeNode } from "../core/ZodTypeNode";
import type { ZodTypeState } from "../core/ZodTypeState";

import type { PipelineStageName } from "./stages";

/** Pipeline-scoped directive definition used during execution. */
export type DirectiveDefinition = {
  /** Directive name without the `@` prefix. */
  name: string;
  /** Stage where the directive is allowed to run. */
  stage: PipelineStageName;
  /** Capabilities required on the current node. */
  requires: readonly Capability[];
  /** Directive implementation for this stage. */
  apply: (input: {
    /** Current rendering state. */
    state: ZodTypeState;
    /** Resolver node being transformed. */
    node: ZodTypeNode;
    /** Source directive AST node. */
    directive: DirectiveNode;
  }) => ZodTypeState;
};

/**
 * Applies directives matching a single pipeline stage.

 * @param state Current pipeline state.
 * @param node Resolver node whose directives are being processed.
 * @param stage Stage to execute.
 * @returns Updated pipeline state after stage execution.
 */
export function applyDirectiveStage(
  state: ZodTypeState,
  node: ZodTypeNode,
  stage: PipelineStageName,
): ZodTypeState {
  let nextState = state;

  for (const directive of node.directives) {
    const definition = nextState.directives[directive.name.value] as
      | DirectiveDefinition
      | undefined;
    if (!definition || definition.stage !== stage) {
      continue;
    }

    if (!hasCapabilities(nextState.capabilities, definition.requires)) {
      nextState = {
        ...nextState,
        issues: [
          ...nextState.issues,
          {
            message: `Directive @${definition.name} requires capabilities: ${definition.requires.join(", ")}`,
          },
        ],
      };
      continue;
    }

    nextState = definition.apply({ state: nextState, node, directive });
  }

  return nextState;
}
