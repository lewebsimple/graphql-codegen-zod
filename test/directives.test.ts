import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getOperationPluginOutput } from "../src/lib/operation";

describe("document directives", () => {
  it("applies @required on output fields by forcing non-null output schema", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @required on FIELD

      type User {
        name: String
      }

      type Query {
        viewer: User!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Viewer {
            viewer {
              name @required
            }
          }
        `),
      },
    ];

    const output = getOperationPluginOutput({
      schema,
      documents,
      operationType: OperationTypeNode.QUERY,
      operationName: "Viewer",
    });

    expect(output).toContain("name: z.string()");
    expect(output).not.toContain("name: z.string().nullable()");
  });

  it("keeps nullable output when @required is not present", () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        name: String
      }

      type Query {
        viewer: User!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Viewer {
            viewer {
              name
            }
          }
        `),
      },
    ];

    const output = getOperationPluginOutput({
      schema,
      documents,
      operationType: OperationTypeNode.QUERY,
      operationName: "Viewer",
    });

    expect(output).toContain("name: z.string().nullable()");
  });
});
