import { buildSchemaExpression } from "../core/schema-builder";
import type { ZodTypeNode } from "../core/zod-type-node";
import type { ZodTypeState } from "../core/zod-type-state";

import { applyDirectiveStage } from "./instructions";
import type { PipelineStage, PipelineStageInput, PipelineStages } from "./stages";

const defaultTransformStage: PipelineStage = ({ node, state }) =>
  applyDirectiveStage(state, node, "transform");

const defaultValidateStage: PipelineStage = ({ node, state }) =>
  applyDirectiveStage(state, node, "validate");

/**
 * Executes configured pipeline stages and finalizes the schema expression.

 * @param input Node, state, and optional stage overrides.
 * @returns Final pipeline state with a built schema expression.
 */
export function executePipeline({
  node,
  state,
  stages,
}: {
  node: ZodTypeNode;
  state: ZodTypeState;
  stages?: Partial<PipelineStages>;
}): ZodTypeState {
  const transformStages = stages?.transform ?? [defaultTransformStage];
  const validateStages = stages?.validate ?? [defaultValidateStage];

  let nextState = runStages({ node, state }, transformStages);
  nextState = runStages({ node, state: nextState }, validateStages);

  return buildSchemaExpression(nextState);
}

/**
 * Runs a list of stages sequentially.

 * @param input Stage input containing the node and current state.
 * @param stageList Stages to execute in order.
 * @returns State produced by the last stage.
 */
function runStages(input: PipelineStageInput, stageList: PipelineStage[]): ZodTypeState {
  let nextState = input.state;
  for (const stage of stageList) {
    nextState = stage({ node: input.node, state: nextState });
  }
  return nextState;
}
