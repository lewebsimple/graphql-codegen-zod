import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { extendSchemaWithZodDirectives } from "../src/directives";
import { getOperationPluginOutput } from "../src/generator/operation";

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

  it("extends a schema with directive definitions from the registry", () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ping: String!
      }
    `);

    const extended = extendSchemaWithZodDirectives(schema);
    const requiredDirective = extended.getDirective("required");

    expect(requiredDirective).toBeDefined();
    expect(requiredDirective?.locations).toContain("FIELD");
    expect(requiredDirective?.locations).toContain("VARIABLE_DEFINITION");
  });

  it("applies @required on variable definitions in variables schema", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @required on VARIABLE_DEFINITION

      type Query {
        viewer(name: String): String
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Viewer($name: String @required) {
            viewer(name: $name)
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

    expect(output).toContain("name: z.string().optional()");
    expect(output).not.toContain("name: z.string().nullable().optional()");
  });
});
