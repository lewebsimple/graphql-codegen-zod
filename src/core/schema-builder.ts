import type { ZodTypeState } from "./ZodTypeState";

/**
 * Finalizes a schema expression by applying state-driven suffixes.

 * @param state Rendering state to serialize into a Zod expression.
 * @returns Updated state containing the finalized schema expression.
 */
export function buildSchemaExpression(state: ZodTypeState): ZodTypeState {
  let schema = state.schema;

  if (state.nullable) {
    schema += ".nullable()";
  }

  if (state.optional) {
    schema += ".optional()";
  }

  if (state.defaultValue !== undefined) {
    schema += `.default(${JSON.stringify(state.defaultValue)})`;
  }

  for (const transform of state.transforms) {
    schema += transform;
  }

  return { ...state, schema };
}
