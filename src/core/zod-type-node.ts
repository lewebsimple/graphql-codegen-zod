import type { DirectiveNode, GraphQLSchema, GraphQLType } from "graphql";

import type { Capability } from "./capabilities";

/** Discriminant for resolver nodes used during schema rendering. */
export type ZodTypeNodeKind =
  | "scalar"
  | "object"
  | "enum"
  | "list"
  | "union"
  | "named-fragment"
  | "inline-fragment";

/** Resolver tree node describing a GraphQL type and its rendering metadata. */
export type ZodTypeNode = {
  /** Resolver-specific node kind. */
  kind: ZodTypeNodeKind;
  /** Backing GraphQL type or synthetic schema marker. */
  graphqlType: GraphQLType | GraphQLSchema;
  /** Nested child nodes for objects, lists, and unions. */
  children: ZodTypeNode[];
  /** Directives applied to this node in the source document. */
  directives: readonly DirectiveNode[];
  /** Capabilities used to validate directive applicability. */
  capabilities: Set<Capability>;
  /** Field, type, or fragment name associated with the node. */
  name?: string;
  /** Default value attached to an input node. */
  defaultValue?: unknown;
};
