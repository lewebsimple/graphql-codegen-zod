import type { ZodTypeNode } from "../core/zod-type-node";
import type { ZodTypeState } from "../core/zod-type-state";

/** Named pipeline stage. */
export type PipelineStageName = "transform" | "validate";

/** Pipeline callback input. */
export type PipelineStageInput = {
  /** Resolver node being processed. */
  node: ZodTypeNode;
  /** Mutable pipeline state. */
  state: ZodTypeState;
};

/** Single pipeline stage callback. */
export type PipelineStage = (input: PipelineStageInput) => ZodTypeState;

/** Grouped pipeline stages by lifecycle step. */
export type PipelineStages = {
  /** Transform stages run before validation stages. */
  transform: PipelineStage[];
  /** Validation stages run after transforms. */
  validate: PipelineStage[];
};
