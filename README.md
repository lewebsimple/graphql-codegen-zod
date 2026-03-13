# GraphQL Codegen Zod

GraphQL Codegen preset for generating Zod schemas.

## Install

```bash
pnpm add -D @lewebsimple/graphql-codegen-zod
pnpm add graphql zod
```

## Usage

`codegen.yml`

```yml
schema: src/schema.graphql
documents: src/**/*.gql
generates:
  src/generated/registry.ts:
    preset: "@lewebsimple/graphql-codegen-zod"
```

Run:

```bash
pnpm graphql-codegen
```

## Output

The preset generates Zod schemas for:

- enums
- fragments
- operations (result and variables)
- top-level registry

## Document Directives

Directives are applied through a hook-based mechanism in `src/directives.ts`, split into:

- input directives hooks
- output directives hooks

This keeps directive behavior modular and makes adding new directives easier.

Directive registry data (metadata + state transforms) lives in `src/directives/`.

Supported directives:

- `@required` on output fields: removes `.nullable()` from the generated field schema.

Example:

```graphql
directive @required on FIELD

query Viewer {
  viewer {
    name @required
  }
}
```

Notes:

- If your codegen setup validates documents, define these directives in your schema (or schema extensions) so validation succeeds.
- `@required` currently applies to operation/fragment result schemas (selection sets).

### Tooling Schema Extension

If you want editor/codegen validation and autocomplete for directives, import the schema extender from the dedicated subpath:

```ts
import { extendSchemaWithZodDirectives } from "@lewebsimple/graphql-codegen-zod/directives";
```

This helper is intentionally exported separately from the preset entrypoint.

It always extends the schema with all supported Zod directive locations (input and output).
