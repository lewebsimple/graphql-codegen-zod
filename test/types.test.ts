import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getTypesPluginOutput } from "../src/generator/types";

describe("types generator", () => {
  it("generates a type-only barrel for enums, fragments, and operations", () => {
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

          query Ping {
            ping
          }
        `),
      },
    ];

    const output = getTypesPluginOutput({ schema, documents });

    expect(output).toContain('export type { EpisodeEnum } from "./enums/Episode";');
    expect(output).toContain('export type { ViewerFragment } from "./fragments/Viewer";');
    expect(output).toContain(
      'export type { PingResult, PingVariables } from "./operations/Ping.query";',
    );
  });
});
