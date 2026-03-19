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

## Document directives

Directive registry data lives in `src/directives/`, and each directive declares both:

- the capabilities it requires before it may run
- the capability transitions it performs after it runs

Internally, capabilities use a prefixed taxonomy such as `io:output`, `type:scalar`,
`null:allowed`, `optional:rejected`, and `transform:allowed`. These guardrails let
generation fail deterministically when incompatible directives are composed.

Supported directives:

- `@email` on scalar fields or variables: emits `z.email()`.
- `@nonNull(target: SELF | ITEMS | SELF_AND_ITEMS)` on nullable fields or variables: removes `.nullable()` from the current value, the immediate list item type, or both.
- `@nullTo(value: ZodValue!, target: SELF | ITEMS)` on nullable scalar fields or variables: accepts `null` and transforms it to the provided literal fallback.
- `@nullToUndefined` on nullable fields or variables: accepts `null` and transforms it to `undefined`.
- `@nullToEmpty` on nullable list fields or variables: accepts `null` and transforms it to `[]`.
- `@filterNullItems` on list fields or variables: filters `null` items out of the immediate list level without rejecting the whole list.

Example:

```graphql
query AllFilms {
  allFilms @nonNull {
    films @nullToEmpty @filterNullItems {
      title @nonNull
      director @nonNull
    }
  }
}
```

Notes:

- If your codegen setup validates documents, define these directives in your schema (or schema extensions) so validation succeeds.
- `ITEMS` and `SELF_AND_ITEMS` apply to one list level only.
- `@nullTo` currently supports built-in GraphQL scalar fallbacks with literal values.
- These directives currently apply to operation/fragment result schemas and operation variables.

### Capability guardrails

Directive capability violations are hard errors during generation.

- Pre- and post-transition invariants are checked around each directive application.
- Unknown transition capabilities, overlapping `adds`/`removes`, and invalid removals fail generation.
- Invalid directive targets or conflicting directive combinations are not downgraded to warnings.

### Tooling schema extension

If you want editor/codegen validation and autocomplete for directives, import the schema extender from the dedicated subpath:

```ts
import { extendSchemaWithZodDirectives } from "@lewebsimple/graphql-codegen-zod/extend-schema";
```

This helper is intentionally exported separately from the preset entrypoint.

It extends the schema with the supported directive definitions plus the shared `ZodValue` scalar and `ZodDirectiveTarget` enum used by directive arguments.
