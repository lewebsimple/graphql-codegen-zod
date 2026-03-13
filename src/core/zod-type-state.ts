import type { DirectiveRegistry } from "../pipeline/directive-types";

import {
  assertNodeCapabilityInvariants,
  type Capability,
  selectFragmentCapabilities,
  selectIoCapabilities,
  selectNullCapabilities,
  selectTypeCapabilities,
} from "./capabilities";
import type { DepIdentifier } from "./deps";

/** Pipeline issue emitted while rendering a schema expression. */
export type ZodTypeIssue = {
  /** Human-readable issue description. */
  message: string;
};

/** Mutable rendering state passed through pipeline stages. */
export type ZodTypeState = {
  /** Current schema expression. */
  schema: string;
  /** Input/output rendering context. */
  ioType: "input" | "output";
  /** Collected generated-module dependencies. */
  deps: Set<DepIdentifier>;
  /** Capabilities available on the current node. */
  capabilities: Set<Capability>;
  /** Directive definitions keyed by directive name. */
  directives: Readonly<DirectiveRegistry>;
  /** Whether `.nullable()` should be applied. */
  nullable: boolean;
  /** Whether `.optional()` should be applied. */
  optional: boolean;
  /** Default value to emit with `.default(...)`. */
  defaultValue?: unknown;
  /** Deferred transform suffixes to append to the schema. */
  transforms: string[];
  /** Non-fatal issues collected during rendering. */
  issues: ZodTypeIssue[];
};

/**
 * Creates the initial rendering state for a resolver node.

 * @param ioType Input/output rendering context.
 * @returns Fresh pipeline state with default flags and empty collections.
 */
export function createInitialZodTypeState(ioType: "input" | "output"): ZodTypeState {
  return {
    schema: "",
    ioType,
    deps: new Set<DepIdentifier>(),
    capabilities: new Set<Capability>([`io:${ioType}` as Capability]),
    directives: {},
    nullable: false,
    optional: false,
    transforms: [],
    issues: [],
  };
}

/**
 * Derives the pipeline capability set from a resolver node and render flags.
 *
 * @param input Resolver-node capabilities plus the field optionality context.
 * @returns Fresh capability set for pipeline execution.
 */
export function deriveRenderStateCapabilities({
  nodeCapabilities,
  allowOptional,
}: {
  nodeCapabilities: ReadonlySet<Capability>;
  allowOptional: boolean;
}): Set<Capability> {
  assertNodeCapabilityInvariants(nodeCapabilities);

  const next = new Set<Capability>([
    ...selectIoCapabilities(nodeCapabilities),
    ...selectTypeCapabilities(nodeCapabilities),
    ...selectFragmentCapabilities(nodeCapabilities),
    ...selectNullCapabilities(nodeCapabilities),
  ]);

  if (next.has("io:input") && allowOptional && next.has("null:allowed")) {
    next.add("optional:allowed");
  } else {
    next.add("optional:rejected");
  }

  next.add("transform:allowed");

  return next;
}

/**
 * Syncs render booleans from the authoritative capability state.
 *
 * @param state Current pipeline state.
 * @returns State with `nullable` and `optional` recalculated from capabilities.
 */
export function syncStatePolicyFlags(state: ZodTypeState): ZodTypeState {
  return {
    ...state,
    nullable: state.capabilities.has("null:allowed"),
    optional: state.capabilities.has("optional:allowed"),
  };
}
