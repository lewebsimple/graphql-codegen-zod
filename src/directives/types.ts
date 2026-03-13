import type { DirectiveLocation, DirectiveNode } from "graphql";

import type { Capability } from "../core/capabilities";
import type { ZodTypeNode } from "../core/ZodTypeNode";
import type { ZodTypeState } from "../core/ZodTypeState";
import type { PipelineStageName } from "../pipeline/stages";

/** Directive argument metadata used for SDL generation. */
export type DirectiveArg = {
  /** Argument name. */
  name: string;
  /** SDL type for the argument. */
  typeSDL: string;
};

/** Directive implementation contract used by the pipeline. */
export type DirectiveDefinition = {
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
