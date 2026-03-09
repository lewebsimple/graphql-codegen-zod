import { capitalize } from "es-toolkit/string";

/** DepIdentifier represents a dependency identifier. */
export type DepIdentifier = {
  name: string;
  kind: "document" | "enum" | "fragment" | "query" | "mutation" | "subscription";
};

/** DepSchemaIdentifier represents the schema identifier for a dependency. */
export type DepSchemaIdentifier =
  | { name: string; kind: "document" | "enum" | "fragment" }
  | { name: string; kind: "query" | "mutation" | "subscription"; target: "result" | "variables" };

/**
 * Generates the schema identifier for a dependency.
 * @param dep Dependency identifier and schema target.
 * @returns Schema identifier as a string.
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

export type GetImportsOptions = {
  deps?: Set<DepIdentifier>;
  rootDir: string;
  zod: boolean;
};

/**
 * Generates import statements for the given dependencies.
 * @param options Options for generating imports.
 * @returns Array of import statements as strings.
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
            `import {`,
            `  resultSchema as ${getDepSchemaIdentifier({ name, kind, target: "result" })},`,
            `  variablesSchema as ${getDepSchemaIdentifier({ name, kind, target: "variables" })},`,
            `} from "./operations/${name}.${kind}";`,
          ].join("\n"),
        );
        break;
    }
  }

  return imports;
}

function sortDeps(deps: Set<DepIdentifier>): DepIdentifier[] {
  return [...deps].sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind.localeCompare(b.kind);
  });
}
