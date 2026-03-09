import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getRegistryPluginOutput } from "../src/lib/registry";

describe("registry generator", () => {
  it("generates enums, fragments, and operations registries", () => {
    const schema = buildSchema(/* GraphQL */ `
      enum Episode {
        NEWHOPE
      }

      type Query {
        ping: String!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          fragment Viewer on Query {
            ping
          }

          mutation Ping {
            ping
          }
        `),
      },
    ];

    const output = getRegistryPluginOutput({ schema, documents });

    expect(output).toContain("export const enums = {");
    expect(output).toContain('"Episode": { schema: zodEpisodeEnumSchema },');
    expect(output).toContain("export const fragments = {");
    expect(output).toContain('"Viewer": { schema: zodViewerFragmentSchema },');
    expect(output).toContain("export const operations = {");
    expect(output).toContain("Ping: {");
    expect(output).toContain('kind: "mutation"');
    expect(output).toContain("resultSchema: zodPingResultSchema");
    expect(output).toContain("variablesSchema: zodPingVariablesSchema");
  });
});
