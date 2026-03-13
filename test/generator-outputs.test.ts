import type { Types } from "@graphql-codegen/plugin-helpers";
import { buildSchema, OperationTypeNode, parse } from "graphql";
import { describe, expect, it } from "vitest";

import { getEnumPluginOutput } from "../src/generator/enum";
import { getFragmentPluginOutput } from "../src/generator/fragment";
import { getOperationPluginOutput } from "../src/generator/operation";

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
});
