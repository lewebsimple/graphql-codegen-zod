import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { extendSchemaWithZodDirectives } from "../src/extend-schema";
import { getOperationPluginOutput } from "../src/generator/operation";

function getQueryOutput(schemaSDL: string, documentSDL: string): string {
  const schema = buildSchema(schemaSDL);
  const documents: Types.DocumentFile[] = [
    {
      location: "operations.graphql",
      document: parse(documentSDL),
    },
  ];

  return getOperationPluginOutput({
    schema,
    documents,
    operationType: OperationTypeNode.QUERY,
    operationName: "Viewer",
  });
}

describe("document directives", () => {
  it("applies @nonNull on output fields by forcing non-null output schema", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          name: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            name @nonNull
          }
        }
      `,
    );

    expect(output).toContain("name: z.string()");
    expect(output).not.toContain("name: z.string().nullable()");
  });

  it("keeps nullable output when @nonNull is not present", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          name: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            name
          }
        }
      `,
    );

    expect(output).toContain("name: z.string().nullable()");
  });

  it("extends a schema with the new directive and support type definitions", () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ping: String!
      }
    `);

    const extended = extendSchemaWithZodDirectives(schema);
    const nonNullDirective = extended.getDirective("nonNull");
    const decodeHTMLDirective = extended.getDirective("decodeHTML");

    expect(nonNullDirective).toBeDefined();
    expect(nonNullDirective?.locations).toContain("FIELD");
    expect(nonNullDirective?.locations).toContain("VARIABLE_DEFINITION");
    expect(decodeHTMLDirective).toBeDefined();
    expect(decodeHTMLDirective?.locations).toContain("FIELD");
    expect(decodeHTMLDirective?.locations).toContain("VARIABLE_DEFINITION");
    expect(extended.getType("ZodDirectiveTarget")).toBeDefined();
    expect(extended.getType("ZodValue")).toBeDefined();
  });

  it("applies @nonNull on variable definitions in variables schema", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          viewer(name: String): String
        }
      `,
      /* GraphQL */ `
        query Viewer($name: String @nonNull) {
          viewer(name: $name)
        }
      `,
    );

    expect(output).toContain("name: z.string()");
    expect(output).not.toContain("name: z.string().optional()");
    expect(output).not.toContain("name: z.string().nullish()");
  });

  it("applies @email on output fields as z.email()", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          email: String!
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            email @email
          }
        }
      `,
    );

    expect(output).toContain("email: z.email()");
    expect(output).not.toContain("email: z.string().email()");
  });

  it("applies @email on variables as z.email()", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          viewer(email: String): String
        }
      `,
      /* GraphQL */ `
        query Viewer($email: String @email) {
          viewer(email: $email)
        }
      `,
    );

    expect(output).toContain("email: z.email().nullish()");
    expect(output).not.toContain("email: z.string().email()");
  });

  it("applies @enum on output string fields as z.enum(...)", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          color: String!
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            color @enum(values: ["default", "muted", "inverted"])
          }
        }
      `,
    );

    expect(output).toContain('color: z.enum(["default", "muted", "inverted"])');
    expect(output).not.toContain("color: z.string()");
  });

  it("applies @enum on string variables", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          viewer(color: String): String
        }
      `,
      /* GraphQL */ `
        query Viewer($color: String @enum(values: ["default", "muted", "inverted"])) {
          viewer(color: $color)
        }
      `,
    );

    expect(output).toContain('color: z.enum(["default", "muted", "inverted"]).nullish()');
    expect(output).not.toContain("color: z.string()");
  });

  it("applies @decodeHTML on output string fields", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          bio: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            bio @decodeHTML
          }
        }
      `,
    );

    expect(output).toContain('import { decodeHTML } from "entities";');
    expect(output).toContain(
      "bio: z.string().nullable().transform((value) => (value == null ? value : decodeHTML(value)))",
    );
  });

  it("imports decodeHTML once when multiple fields use @decodeHTML", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          bio: String
          nickname: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            bio @decodeHTML
            nickname @decodeHTML
          }
        }
      `,
    );

    expect(output.match(/import \{ decodeHTML \} from "entities";/g)).toHaveLength(1);
  });

  it("applies @decodeHTML on string variables", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          viewer(search: String): String
        }
      `,
      /* GraphQL */ `
        query Viewer($search: String @decodeHTML) {
          viewer(search: $search)
        }
      `,
    );

    expect(output).toContain(
      "search: z.string().nullish().transform((value) => (value == null ? value : decodeHTML(value)))",
    );
  });

  it("applies @nullTo on output fields", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          nickname: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            nickname @nullTo(value: "Anon")
          }
        }
      `,
    );

    expect(output).toContain(
      'nickname: z.string().nullable().transform((value) => (value === null ? "Anon" : value))',
    );
  });

  it("applies @nullToUndefined on output fields", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type User {
          nickname: String
        }

        type Query {
          viewer: User!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          viewer {
            nickname @nullToUndefined
          }
        }
      `,
    );

    expect(output).toContain(
      "nickname: z.string().nullable().transform((value) => (value === null ? undefined : value))",
    );
  });

  it("applies @nullToEmpty on nullable lists", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          tags: [String]
        }
      `,
      /* GraphQL */ `
        query Viewer {
          tags @nullToEmpty
        }
      `,
    );

    expect(output).toContain(
      "tags: z.array(z.string().nullable()).nullable().transform((value) => (value === null ? [] : value))",
    );
  });

  it("applies @filterNullItems on nullable lists", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          tags: [String]
        }
      `,
      /* GraphQL */ `
        query Viewer {
          tags @filterNullItems
        }
      `,
    );

    expect(output).toContain(
      "tags: z.array(z.string().nullable()).nullable().transform((value) => (value == null ? value : value.filter((item): item is NonNullable<typeof item> => item != null)))",
    );
  });

  it("applies @nonNull(target: SELF_AND_ITEMS) to one list level", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          tags: [String]
        }
      `,
      /* GraphQL */ `
        query Viewer {
          tags @nonNull(target: SELF_AND_ITEMS)
        }
      `,
    );

    expect(output).toContain("tags: z.array(z.string())");
    expect(output).not.toContain("tags: z.array(z.string()).nullable()");
    expect(output).not.toContain("tags: z.array(z.string().nullable())");
  });

  it("applies @nullTo on immediate list items", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          tags: [String]!
        }
      `,
      /* GraphQL */ `
        query Viewer {
          tags @nullTo(value: "Anon", target: ITEMS)
        }
      `,
    );

    expect(output).toContain(
      'tags: z.array(z.string().nullable().transform((value) => (value === null ? "Anon" : value)))',
    );
  });

  it("applies native GraphQL default values on variable definitions", () => {
    const output = getQueryOutput(
      /* GraphQL */ `
        type Query {
          viewer(name: String): String
        }
      `,
      /* GraphQL */ `
        query Viewer($name: String = "Unknown") {
          viewer(name: $name)
        }
      `,
    );

    expect(output).toContain('name: z.string().nullish().default("Unknown")');
  });

  it("fails hard when @email targets a non-scalar field", () => {
    const schema = buildSchema(/* GraphQL */ `
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

  it("fails when @enum targets a non-string scalar", () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        age: Int!
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
              age @enum(values: ["18", "21"])
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
    ).toThrowError("Directive @enum can only be applied to String fields or variables");
  });

  it("fails when @decodeHTML targets a non-string scalar", () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        age: Int!
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
              age @decodeHTML
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
    ).toThrowError("Directive @decodeHTML can only be applied to String fields or variables");
  });

  it("fails hard when @nonNull and @nullToUndefined conflict", () => {
    const schema = buildSchema(/* GraphQL */ `
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
              nickname @nonNull @nullToUndefined
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
      "Capability guardrail violation for @nullToUndefined at transform: missing required capabilities: null:allowed",
    );
  });

  it("fails when an item target is used on a non-list field", () => {
    const schema = buildSchema(/* GraphQL */ `
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
              nickname @nonNull(target: ITEMS)
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
    ).toThrowError("Directive @nonNull target ITEMS requires a list type");
  });
});
