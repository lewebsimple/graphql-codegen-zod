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

Directive registry data lives in `src/directives/`, and each directive declares both:

- the capabilities it requires before it may run
- the capability transitions it performs after it runs

Internally, capabilities use a prefixed taxonomy such as `io:output`, `type:scalar`,
`null:allowed`, `optional:rejected`, and `transform:allowed`. These guardrails let
generation fail deterministically when incompatible directives are composed.

Supported directives:

- `@required` on nullable fields or variables: removes `.nullable()` from the generated schema.
- `@coerceNull` on nullable fields or variables: accepts `null` and transforms it to `undefined` by default, or to a provided fallback.
- `@default` on nullable output fields: accepts `null` and transforms it to the provided default.
- `@email` on scalar fields or variables: emits `z.email()`.

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

### Capability Guardrails

Directive capability violations are hard errors during generation.

- Pre- and post-transition invariants are checked around each directive application.
- Unknown transition capabilities, overlapping `adds`/`removes`, and invalid removals fail generation.
- Invalid directive targets or conflicting directive combinations are not downgraded to warnings.

### Tooling Schema Extension

If you want editor/codegen validation and autocomplete for directives, import the schema extender from the dedicated subpath:

```ts
import { extendSchemaWithZodDirectives } from "@lewebsimple/graphql-codegen-zod/directives";
```

This helper is intentionally exported separately from the preset entrypoint.

It always extends the schema with all supported Zod directive locations (input and output).
