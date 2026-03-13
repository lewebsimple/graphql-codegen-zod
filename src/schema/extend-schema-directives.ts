import { extendSchema, parse, type DirectiveLocation, type GraphQLSchema } from "graphql";

import { directiveRegistry } from "../directives/index";

/**
 * Builds SDL definitions for all registered directives.

 * @returns Concatenated directive SDL.
 */
export function getZodDirectivesSDL(): string {
  const directivesSDL: string[] = [];

  for (const [directiveName, definition] of Object.entries(directiveRegistry).sort()) {
    const locations = new Set<DirectiveLocation>(definition.locations);

    if (locations.size === 0) {
      continue;
    }

    const argsSDL = definition.args?.length
      ? `(${definition.args.map((arg) => `${arg.name}: ${arg.typeSDL}`).join(", ")})`
      : "";

    directivesSDL.push(
      `directive @${directiveName}${argsSDL} on ${[...locations].sort().join(" | ")}`,
    );
  }

  return directivesSDL.join("\n");
}

/**
 * Extends a schema with the registered Zod directives.

 * @param schema Base GraphQL schema.
 * @returns Extended schema containing Zod directive definitions.
 */
export function extendSchemaWithZodDirectives(schema: GraphQLSchema): GraphQLSchema {
  const directivesSDL = getZodDirectivesSDL();
  if (!directivesSDL.trim()) {
    return schema;
  }

  return extendSchema(schema, parse(directivesSDL), { assumeValidSDL: true });
}
