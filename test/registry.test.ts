import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getRegistryPluginOutput } from "../src/lib/registry";

describe("registry generator", () => {
  it("includes operation helper types and flat registry", () => {
    const schema = buildSchema(/* GraphQL */ `
      enum Episode {
        NEWHOPE
      }

      type Query {
        allFilms: [String!]!
      }

      type Mutation {
        ping: String!
      }

      type Subscription {
        onPing: String!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query AllFilms {
            allFilms
          }

          mutation Ping {
            ping
          }
        `),
      },
    ];

    const output = getRegistryPluginOutput(schema, documents);

    expect(output).toContain("export const registry = {");
    expect(output).toContain("} as const;");
    expect(output).toContain("export type OperationRegistry = typeof registry;");
    expect(output).toContain("export type OperationName = keyof OperationRegistry;");
    expect(output).toContain(
      'export type OperationKind = OperationRegistry[OperationName]["kind"];',
    );
    expect(output).toContain("export type QueryName = {");
    expect(output).toContain("export type MutationName = {");
    expect(output).toContain("export type SubscriptionName = {");
    expect(output).toContain(
      "export type OperationVariables<OperationNameT extends OperationName> = z.input<",
    );
    expect(output).toContain(
      "export type OperationResult<OperationNameT extends OperationName> = z.output<",
    );
    expect(output).toContain("export type OperationResultsByName = {");
    expect(output).toContain("export type OperationVariablesByName = {");
    expect(output).toContain('"AllFilms": { kind: "query",');
    expect(output).toContain('"Ping": { kind: "mutation",');
  });
});
