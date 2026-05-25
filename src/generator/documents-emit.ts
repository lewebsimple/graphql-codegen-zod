import type { Types } from "@graphql-codegen/plugin-helpers";
import { print, visit, type FragmentDefinitionNode } from "graphql";

import {
  getFragmentDefinitionMap,
  getFragmentDefinitions,
  getOperationDefinitions,
} from "./documents";

/** Options for the lean documents emitter. */
export type GetDocumentsPluginOutputOptions = {
  /** Parsed GraphQL documents. */
  documents: Types.DocumentFile[];
};

/**
 * Emits a single module containing the `TypedDocumentString` class and one
 * constant per operation/fragment whose value is the printed SDL string.
 *
 * Unlike the standard `typescript` + `typescript-operations` +
 * `typed-document-node` combination, this emitter generates no TypeScript type
 * aliases — phantom typing is left at `unknown`. Consumers that derive runtime
 * types via Zod schemas (the rest of the preset's output) are unaffected; only
 * direct AST-style consumers of the document constants lose static typing.
 *
 * Trade-off: massively smaller output for huge schemas, where the per-operation
 * type aliases dominate file size and trip parser recursion limits.
 */
export function getDocumentsPluginOutput({ documents }: GetDocumentsPluginOutputOptions): string {
  const fragmentMap = getFragmentDefinitionMap(documents);

  const lines: string[] = [
    `import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";`,
    "",
    "export class TypedDocumentString<TResult, TVariables>",
    "  extends String",
    "  implements DocumentTypeDecoration<TResult, TVariables>",
    "{",
    '  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>["__apiType"]>;',
    "  private value: string;",
    "  constructor(value: string) {",
    "    super(value);",
    "    this.value = value;",
    "  }",
    "  override toString(): string {",
    "    return this.value;",
    "  }",
    "}",
    "",
  ];

  for (const fragmentDef of getFragmentDefinitions(documents)) {
    const name = fragmentDef.name.value;
    lines.push(
      `export const ${name}FragmentDoc = new TypedDocumentString(${quote(print(fragmentDef))}) as unknown as TypedDocumentString<unknown, unknown>;`,
    );
  }

  for (const operationDef of getOperationDefinitions(documents)) {
    const name = operationDef.name!.value;
    const deps = collectFragmentDependencies(operationDef, fragmentMap);
    const sdl = [print(operationDef), ...deps.map((dep) => print(dep))].join("\n");
    lines.push(
      `export const ${name}Document = new TypedDocumentString(${quote(sdl)}) as unknown as TypedDocumentString<unknown, unknown>;`,
    );
  }

  return lines.join("\n") + "\n";
}

/**
 * Collects fragment definitions transitively referenced by a node.
 *
 * Returned in stable, dependency-respecting order: dependencies appear before
 * the fragments that reference them. Matches the inlining behavior of
 * `typed-document-node` so the resulting document is self-contained when sent
 * to a GraphQL endpoint.
 */
function collectFragmentDependencies(
  root: { readonly kind: string },
  fragmentMap: ReadonlyMap<string, FragmentDefinitionNode>,
): FragmentDefinitionNode[] {
  const visited = new Set<string>();
  const ordered: FragmentDefinitionNode[] = [];

  function walk(node: Parameters<typeof visit>[0]): void {
    visit(node, {
      FragmentSpread(spread) {
        const name = spread.name.value;
        if (visited.has(name)) return;
        const fragmentDef = fragmentMap.get(name);
        if (!fragmentDef) return;
        visited.add(name);
        walk(fragmentDef);
        ordered.push(fragmentDef);
      },
    });
  }

  walk(root as Parameters<typeof visit>[0]);
  return ordered;
}

/** JSON-quote a string for safe embedding in TS source. */
function quote(value: string): string {
  return JSON.stringify(value);
}
