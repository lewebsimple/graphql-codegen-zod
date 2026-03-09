import type { Types } from "@graphql-codegen/plugin-helpers";
import { parse } from "graphql";
import { describe, expect, it } from "vitest";

import { preset } from "../src/preset";

describe("preset", () => {
  it("builds minimal generate sections", async () => {
    const schema = parse(/* GraphQL */ `
      type Query {
        ping: String!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Ping {
            ping
          }
        `),
      },
    ];

    const sections = await preset.buildGeneratesSection({
      baseOutputDir: "generated/registry.ts",
      config: {},
      documents,
      pluginMap: {},
      schema,
    } as never);

    const filenames = sections.map((section) => section.filename);
    expect(filenames).toContain("generated/documents.ts");
    expect(filenames).toContain("generated/operations/Ping.query.ts");
    expect(filenames).toContain("generated/registry.ts");
  });
});
