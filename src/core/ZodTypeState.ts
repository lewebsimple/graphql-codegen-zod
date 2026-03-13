import type { Capability } from "./capabilities";
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
  directives: Readonly<Record<string, unknown>>;
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
    capabilities: new Set<Capability>([ioType]),
    directives: {},
    nullable: true,
    optional: ioType === "input",
    transforms: [],
    issues: [],
  };
}
