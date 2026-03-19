import type { Types } from "@graphql-codegen/plugin-helpers";
import { parse, print } from "graphql";
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

  it("strips zod directives from runtime documents while preserving GraphQL directives", async () => {
    const schema = parse(/* GraphQL */ `
      type Query {
        ping(email: String): String!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Ping($email: String @email) {
            ping(email: $email) @nonNull @skip(if: false)
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

    const documentsSection = sections.find(
      (section) => section.filename === "generated/documents.ts",
    );
    const document = documentsSection?.documents?.[0]?.document;

    expect(document).toBeDefined();
    expect(print(document!)).not.toContain("@email");
    expect(print(document!)).not.toContain("@nonNull");
    expect(print(document!)).toContain("@skip");
    expect(print(documents[0].document!)).toContain("@email");
    expect(print(documents[0].document!)).toContain("@nonNull");
  });
});
