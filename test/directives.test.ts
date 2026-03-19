import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { extendSchemaWithZodDirectives } from "../src/extend-schema";
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

  it("extends a schema with directive definitions from the extend-schema entrypoint", () => {
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

    expect(output).toContain("name: z.string()");
    expect(output).not.toContain("name: z.string().optional()");
    expect(output).not.toContain("name: z.string().nullish()");
  });

  it("applies @email on output fields as z.email()", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @email on FIELD

      type User {
        email: String!
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
              email @email
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

    expect(output).toContain("email: z.email()");
    expect(output).not.toContain("email: z.string().email()");
  });

  it("applies @email on variables as z.email()", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @email on VARIABLE_DEFINITION

      type Query {
        viewer(email: String): String
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Viewer($email: String @email) {
            viewer(email: $email)
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

    expect(output).toContain("email: z.email().nullish()");
    expect(output).not.toContain("email: z.string().email()");
  });

  it("applies @default on output fields", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @default(value: String) on FIELD

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
              name @default(value: "Unknown")
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

    expect(output).toContain(
      'name: z.string().nullable().transform((value) => (value == null ? "Unknown" : value))',
    );
  });

  it('applies @coerceNull(to: "undefined") on output fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @coerceNull(to: String) on FIELD

      type User {
        nickname: String
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
              nickname @coerceNull(to: "undefined")
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

    expect(output).toContain(
      "nickname: z.string().nullable().transform((value) => (value === null ? undefined : value))",
    );
  });

  it("applies bare @coerceNull as undefined coercion on output fields", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @coerceNull on FIELD

      type User {
        nickname: String
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
              nickname @coerceNull
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

    expect(output).toContain(
      "nickname: z.string().nullable().transform((value) => (value === null ? undefined : value))",
    );
  });

  it("applies @coerceNull(value: ...) on output fields", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @coerceNull(value: String) on FIELD

      type User {
        nickname: String
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
              nickname @coerceNull(value: "Anon")
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

    expect(output).toContain(
      'nickname: z.string().nullable().transform((value) => (value === null ? "Anon" : value))',
    );
  });

  it("applies native GraphQL default values on variable definitions", () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        viewer(name: String): String
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query Viewer($name: String = "Unknown") {
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

    expect(output).toContain('name: z.string().nullish().default("Unknown")');
  });

  it("fails hard when @email targets a non-scalar field", () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @email on FIELD

      type Profile {
        id: ID!
      }

      type User {
        profile: Profile!
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
              profile @email {
                id
              }
            }
          }
        `),
      },
    ];

    expect(() =>
      getOperationPluginOutput({
        schema,
        documents,
        operationType: OperationTypeNode.QUERY,
        operationName: "Viewer",
      }),
    ).toThrowError(
      "Capability guardrail violation for @email at transform: missing required capabilities: type:scalar",
    );
  });

  it('fails hard when @required and @coerceNull(to: "undefined") conflict', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @required on FIELD
      directive @coerceNull(to: String) on FIELD

      type User {
        nickname: String
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
              nickname @required @coerceNull(to: "undefined")
            }
          }
        `),
      },
    ];

    expect(() =>
      getOperationPluginOutput({
        schema,
        documents,
        operationType: OperationTypeNode.QUERY,
        operationName: "Viewer",
      }),
    ).toThrowError(
      "Capability guardrail violation for @coerceNull at transform: missing required capabilities: null:allowed",
    );
  });
});
