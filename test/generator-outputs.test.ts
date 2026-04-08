import type { Types } from "@graphql-codegen/plugin-helpers";
import type { GraphQLSchema } from "graphql";
import { buildSchema, isInterfaceType, isObjectType, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { getDepSchemaIdentifier } from "../src/generator/deps";
import {
  getFragmentDefinition,
  getFragmentTypeConditionMap,
  getOperationDefinition,
} from "../src/generator/documents";
import { getEnumPluginOutput } from "../src/generator/enum";
import { getFragmentPluginOutput } from "../src/generator/fragment";
import { getOperationPluginOutput } from "../src/generator/operation";
import { renderNodeToSchema } from "../src/generator/render-node";
import { resolveSelection } from "../src/resolver/resolve-selection";

function evaluateSchema(expression: string, context: Record<string, unknown> = {}): z.ZodTypeAny {
  const argNames = ["z", ...Object.keys(context)];
  const argValues = [z, ...Object.values(context)];

  return new Function(...argNames, `return ${expression};`)(...argValues) as z.ZodTypeAny;
}

function renderQueryResultSchemaExpression({
  schema,
  documents,
  operationName,
}: {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
  operationName: string;
}): string {
  const operationDef = getOperationDefinition(documents, OperationTypeNode.QUERY, operationName);
  if (!operationDef) {
    throw new Error(`Operation ${operationName} not found`);
  }

  const parentType = schema.getQueryType();
  if (!parentType) {
    throw new Error("Query root type not found");
  }

  return renderNodeToSchema({
    node: resolveSelection({
      schema,
      selectionSet: operationDef.selectionSet,
      parentType,
      fragmentTypeConditions: getFragmentTypeConditionMap(documents),
    }),
    schema,
    deps: new Set(),
  });
}

function renderFragmentSchemaExpression({
  schema,
  documents,
  fragmentName,
}: {
  schema: GraphQLSchema;
  documents: Types.DocumentFile[];
  fragmentName: string;
}): string {
  const fragmentDef = getFragmentDefinition(documents, fragmentName);
  if (!fragmentDef) {
    throw new Error(`Fragment ${fragmentName} not found`);
  }

  const parentType = schema.getType(fragmentDef.typeCondition.name.value);
  if (!parentType || (!isObjectType(parentType) && !isInterfaceType(parentType))) {
    throw new Error(`Fragment ${fragmentName} references unsupported type`);
  }

  return renderNodeToSchema({
    node: resolveSelection({
      schema,
      selectionSet: fragmentDef.selectionSet,
      parentType,
      fragmentTypeConditions: getFragmentTypeConditionMap(documents),
    }),
    schema,
    deps: new Set(),
  });
}

describe("generator outputs", () => {
  it("emits literal z.enum values for standalone enum modules", () => {
    const schema = buildSchema(/* GraphQL */ `
      enum UserRole {
        ADMIN
        USER
      }

      type Query {
        ping: String!
      }
    `);

    const output = getEnumPluginOutput({ schema, enumName: "UserRole" });

    expect(output).toContain(
      'export const enumSchema = z.enum(["ADMIN", "USER"]);'.replaceAll('"', "'"),
    );
  });

  it("uses GraphQL enum type names for imported enum schema identifiers", () => {
    const schema = buildSchema(/* GraphQL */ `
      enum UserRole {
        ADMIN
        USER
      }

      type User {
        role: UserRole!
      }

      type Query {
        viewer: User!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "fragments.graphql",
        document: parse(/* GraphQL */ `
          fragment Viewer on User {
            role
          }
        `),
      },
    ];

    const output = getFragmentPluginOutput({ schema, documents, fragmentName: "Viewer" });

    expect(output).toContain(
      'import { enumSchema as zodUserRoleEnumSchema } from "../enums/UserRole";',
    );
    expect(output).toContain("role: zodUserRoleEnumSchema");
  });

  it("reuses the fragment schema directly when it is the only selected child", () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID!
      }

      type Query {
        getUser: User!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          fragment Viewer on User {
            id
          }

          query GetUser {
            getUser {
              ...Viewer
            }
          }
        `),
      },
    ];

    const output = getOperationPluginOutput({
      schema,
      documents,
      operationType: OperationTypeNode.QUERY,
      operationName: "GetUser",
    });

    expect(output).toContain("getUser: zodViewerFragmentSchema");
    expect(output).not.toContain("getUser: z.object({}).extend(zodViewerFragmentSchema.shape)");
  });

  it("reuses fragment schemas inside list item selections", () => {
    const schema = buildSchema(/* GraphQL */ `
      type Film {
        title: String
        director: String
      }

      type AllFilmsConnection {
        films: [Film]
      }

      type Query {
        allFilms: AllFilmsConnection
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          fragment FilmFields on Film {
            title
            director
          }

          query AllFilms {
            allFilms {
              films {
                ...FilmFields
              }
            }
          }
        `),
      },
    ];

    const output = getOperationPluginOutput({
      schema,
      documents,
      operationType: OperationTypeNode.QUERY,
      operationName: "AllFilms",
    });

    expect(output).toContain("films: z.array(zodFilmFieldsFragmentSchema.nullable()).nullable()");
    expect(output).not.toContain("films: z.array(z.object({  }).nullable()).nullable()");
  });

  it("accepts omitted fields from conditional inline fragments", () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Node {
        id: ID!
      }

      interface NodeWithTitle implements Node {
        id: ID!
        title: String
      }

      type PlainNode implements Node {
        id: ID!
      }

      type TitledNode implements NodeWithTitle & Node {
        id: ID!
        title: String
      }

      type Query {
        node: Node!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query GetNode {
            node {
              id
              ... on NodeWithTitle {
                title
              }
            }
          }
        `),
      },
    ];

    const resultSchema = evaluateSchema(
      renderQueryResultSchemaExpression({ schema, documents, operationName: "GetNode" }),
    );

    expect(resultSchema.safeParse({ node: { id: "1" } }).success).toBe(true);
  });

  it("accepts null values for nullable fields from conditional inline fragments", () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Node {
        id: ID!
      }

      interface NodeWithTitle implements Node {
        id: ID!
        title: String
      }

      type PlainNode implements Node {
        id: ID!
      }

      type TitledNode implements NodeWithTitle & Node {
        id: ID!
        title: String
      }

      type Query {
        node: Node!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query GetNode {
            node {
              id
              ... on NodeWithTitle {
                title
              }
            }
          }
        `),
      },
    ];

    const resultSchema = evaluateSchema(
      renderQueryResultSchemaExpression({ schema, documents, operationName: "GetNode" }),
    );

    expect(resultSchema.safeParse({ node: { id: "1", title: null } }).success).toBe(true);
  });

  it("keeps guaranteed inline fragment fields required", () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Node {
        id: ID!
      }

      interface NodeWithTitle implements Node {
        id: ID!
        title: String
      }

      type TitledNode implements NodeWithTitle & Node {
        id: ID!
        title: String
      }

      type Query {
        titledNode: TitledNode!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          query GetTitledNode {
            titledNode {
              ... on NodeWithTitle {
                title
              }
            }
          }
        `),
      },
    ];

    const resultSchema = evaluateSchema(
      renderQueryResultSchemaExpression({ schema, documents, operationName: "GetTitledNode" }),
    );

    expect(resultSchema.safeParse({ titledNode: {} }).success).toBe(false);
    expect(resultSchema.safeParse({ titledNode: { title: null } }).success).toBe(true);
  });

  it("accepts omitted fields from conditional named fragments", () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Node {
        id: ID!
      }

      interface NodeWithTitle implements Node {
        id: ID!
        title: String
      }

      type PlainNode implements Node {
        id: ID!
      }

      type TitledNode implements NodeWithTitle & Node {
        id: ID!
        title: String
      }

      type Query {
        node: Node!
      }
    `);

    const documents: Types.DocumentFile[] = [
      {
        location: "operations.graphql",
        document: parse(/* GraphQL */ `
          fragment TitleFields on NodeWithTitle {
            title
          }

          query GetNode {
            node {
              id
              ...TitleFields
            }
          }
        `),
      },
    ];

    const fragmentSchema = evaluateSchema(
      renderFragmentSchemaExpression({ schema, documents, fragmentName: "TitleFields" }),
    );
    const resultSchema = evaluateSchema(
      renderQueryResultSchemaExpression({ schema, documents, operationName: "GetNode" }),
      {
        [getDepSchemaIdentifier({ name: "TitleFields", kind: "fragment" })]: fragmentSchema,
      },
    );

    expect(resultSchema.safeParse({ node: { id: "1" } }).success).toBe(true);
  });
});
