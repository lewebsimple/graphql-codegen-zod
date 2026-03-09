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
