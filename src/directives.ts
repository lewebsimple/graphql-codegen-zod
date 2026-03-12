import { extendSchema, parse, type DirectiveLocation, type GraphQLSchema } from "graphql";

import { zodDirectiveRegistry } from "./lib/directives";

/** Generates SDL for all Zod directives (input and output locations). */
function getZodDirectivesSDL(): string {
  const directivesSDL: string[] = [];

  for (const [directiveName, definition] of Object.entries(zodDirectiveRegistry).sort()) {
    const locations = new Set<DirectiveLocation>();

    if (definition.input) {
      for (const location of definition.input.locations) {
        locations.add(location);
      }
    }

    if (definition.output) {
      for (const location of definition.output.locations) {
        locations.add(location);
      }
    }

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
 * Extends a schema with the supported Zod directives for validation and autocomplete.
 *
 * @param schema Base GraphQL schema.
 * @returns Schema extended with Zod directive definitions.
 */
export function extendSchemaWithZodDirectives(schema: GraphQLSchema): GraphQLSchema {
  const directivesSDL = getZodDirectivesSDL();
  if (!directivesSDL.trim()) {
    return schema;
  }

  return extendSchema(schema, parse(directivesSDL), { assumeValidSDL: true });
}
