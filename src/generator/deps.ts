import { capitalize } from "es-toolkit/string";

import type { DepIdentifier } from "../core/deps";

/** Schema symbol name variants used in generated imports. */
export type DepSchemaIdentifier =
  | { name: string; kind: "document" | "enum" | "fragment" }
  | { name: string; kind: "query" | "mutation" | "subscription"; target: "result" | "variables" };

/**
 * Builds the exported schema identifier for a dependency.

 * @param dep Dependency descriptor and optional schema target.
 * @returns Generated identifier name.
 */
export function getDepSchemaIdentifier(dep: DepSchemaIdentifier): string {
  switch (dep.kind) {
    case "document":
      return `${dep.name}Document`;

    case "enum":
      return `zod${dep.name}EnumSchema`;

    case "fragment":
      return `zod${dep.name}FragmentSchema`;

    case "query":
    case "mutation":
    case "subscription":
      return `zod${dep.name}${capitalize(dep.target)}Schema`;
  }
}

/** Options for generated import collection. */
export type GetImportsOptions = {
  /** Dependencies that should be imported. */
  deps?: Set<DepIdentifier>;
  /** Relative root path used by generated imports. */
  rootDir: string;
  /** Whether the file should import `z` from `zod`. */
  zod: boolean;
};

/**
 * Builds import lines for generated modules.

 * @param options Import generation options.
 * @returns Import lines in stable order, including a trailing blank line when non-empty.
 */
export function getImports({
  deps = new Set<DepIdentifier>(),
  rootDir,
  zod,
}: GetImportsOptions): string[] {
  const imports: string[] = [];

  if (zod) {
    imports.push('import { z } from "zod";');
  }

  for (const { name, kind } of sortDeps(deps)) {
    switch (kind) {
      case "document":
        imports.push(`import { ${name}Document } from "${rootDir}/documents";`);
        break;

      case "enum":
        imports.push(
          `import { enumSchema as ${getDepSchemaIdentifier({ name, kind })} } from "${rootDir}/enums/${name}";`,
        );
        break;

      case "fragment":
        imports.push(
          `import { fragmentSchema as ${getDepSchemaIdentifier({ name, kind })} } from "${rootDir}/fragments/${name}";`,
        );
        break;

      case "query":
      case "mutation":
      case "subscription":
        imports.push(
          [
            "import {",
            `  resultSchema as ${getDepSchemaIdentifier({ name, kind, target: "result" })},`,
            `  variablesSchema as ${getDepSchemaIdentifier({ name, kind, target: "variables" })},`,
            `} from "./operations/${name}.${kind}";`,
          ].join("\n"),
        );
        break;
    }
  }

  if (imports.length > 0) {
    imports.push("");
  }

  return imports;
}

/**
 * Sorts dependencies deterministically for stable output.

 * @param deps Dependencies to sort.
 * @returns Sorted dependency array.
 */
function sortDeps(deps: Set<DepIdentifier>): DepIdentifier[] {
  return [...deps].sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind.localeCompare(b.kind);
  });
}
