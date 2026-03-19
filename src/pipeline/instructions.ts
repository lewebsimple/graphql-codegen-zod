import {
  applyCapabilityTransition,
  areCapabilitySetsEqual,
  assertStateCapabilityInvariants,
  hasCapabilities,
  validateCapabilityTransition,
} from "../core/capabilities";
import type { ZodTypeNode } from "../core/zod-type-node";
import { syncStatePolicyFlags, type ZodTypeState } from "../core/zod-type-state";

import type { DirectiveDefinition } from "./directive-helpers";
import type { PipelineStageName } from "./stages";

function getDirectiveGuardrailError(
  directiveName: string,
  stage: PipelineStageName,
  rule: string,
): Error {
  return new Error(`Capability guardrail violation for @${directiveName} at ${stage}: ${rule}`);
}

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

    try {
      assertStateCapabilityInvariants(nextState.capabilities);
    } catch (error) {
      throw getDirectiveGuardrailError(
        definition.name,
        stage,
        error instanceof Error ? error.message : String(error),
      );
    }

    if (!hasCapabilities(nextState.capabilities, definition.requires)) {
      const missingCapabilities = definition.requires.filter(
        (capability) => !nextState.capabilities.has(capability),
      );
      throw getDirectiveGuardrailError(
        definition.name,
        stage,
        `missing required capabilities: ${missingCapabilities.join(", ")}`,
      );
    }

    const capabilitiesBeforeApply = new Set(nextState.capabilities);
    const appliedState = definition.apply({ state: nextState, node, directive });

    if (!areCapabilitySetsEqual(appliedState.capabilities, capabilitiesBeforeApply)) {
      throw getDirectiveGuardrailError(
        definition.name,
        stage,
        "directive apply() must not mutate capabilities directly",
      );
    }

    try {
      validateCapabilityTransition(capabilitiesBeforeApply, definition);
    } catch (error) {
      throw getDirectiveGuardrailError(
        definition.name,
        stage,
        error instanceof Error ? error.message : String(error),
      );
    }

    nextState = syncStatePolicyFlags({
      ...appliedState,
      capabilities: applyCapabilityTransition(capabilitiesBeforeApply, definition),
    });

    try {
      assertStateCapabilityInvariants(nextState.capabilities);
    } catch (error) {
      throw getDirectiveGuardrailError(
        definition.name,
        stage,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return nextState;
}
