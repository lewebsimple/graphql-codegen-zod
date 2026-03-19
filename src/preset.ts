import { basename, dirname, join } from "node:path";

import * as addPlugin from "@graphql-codegen/add";
import type { Types } from "@graphql-codegen/plugin-helpers";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";
import type { TypeScriptTypedDocumentNodesConfig } from "@graphql-codegen/typed-document-node";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import type { TypeScriptPluginConfig } from "@graphql-codegen/typescript";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import type { TypeScriptDocumentsPluginConfig } from "@graphql-codegen/typescript-operations";
import { buildASTSchema } from "graphql";

import {
  getEnumTypes,
  getFragmentDefinitions,
  getOperationDefinitions,
} from "./generator/documents";
import * as zodPlugin from "./plugin";

/** GraphQL Code Generator preset for multi-file Zod output. */
export const preset: Types.OutputPreset = {
  /**
   * Builds the list of generate sections for the preset output.
   *
   * @param options Codegen output options.
   * @returns Generate sections consumed by GraphQL Code Generator.
   */
  buildGeneratesSection: async (options) => {
    const baseConfig = {
      config: {
        ...options.config,
        avoidOptionals: { field: true, object: false },
        defaultScalarType: "unknown",
        strictScalars: true,
        typesPrefix: "Gql",
        useTypeImports: true,
      },
      documents: options.documents,
      schema: options.schema,
      schemaAst: options.schemaAst || buildASTSchema(options.schema),
      pluginMap: {
        ...options.pluginMap,
        add: addPlugin,
        typescript: typescriptPlugin,
        typescriptOperations: typescriptOperationsPlugin,
        typedDocumentNode: typedDocumentNodePlugin,
        zod: zodPlugin,
      },
    } satisfies Partial<Types.GenerateOptions>;

    // Validate output directory / filename
    const outputDir = dirname(options.baseOutputDir);
    const outputName = basename(options.baseOutputDir);
    if (!outputName.endsWith(".ts")) {
      throw new Error(`Zod preset expects filename to end with .ts, got ${outputName}`);
    }

    // Initialize sections array and helper function to create sections with consistent config
    const sections: Types.GenerateOptions[] = [];
    const section = (
      filename: string,
      plugins: Types.ConfiguredPlugin[],
    ): Types.GenerateOptions => ({ ...baseConfig, filename: join(outputDir, filename), plugins });

    // ────────────────────────────────────────────────────────────────────────────
    // Schema / operations / typed document node
    // ────────────────────────────────────────────────────────────────────────────

    sections.push(
      section("documents.ts", [
        { typescript: {} satisfies TypeScriptPluginConfig },
        { typescriptOperations: {} satisfies TypeScriptDocumentsPluginConfig },
        { typedDocumentNode: {} satisfies TypeScriptTypedDocumentNodesConfig },
      ]),
    );

    // ────────────────────────────────────────────────────────────────────────────
    // Enums
    // ────────────────────────────────────────────────────────────────────────────

    for (const { name: enumName } of getEnumTypes(baseConfig.schemaAst)) {
      sections.push(
        section(`enums/${enumName}.ts`, [
          { zod: { mode: "enum", enumName } satisfies zodPlugin.ZodPluginConfig },
        ]),
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Fragments
    // ────────────────────────────────────────────────────────────────────────────

    for (const fragmentDef of getFragmentDefinitions(baseConfig.documents)) {
      const fragmentName = fragmentDef.name.value;

      sections.push(
        section(`fragments/${fragmentName}.ts`, [
          { zod: { mode: "fragment", fragmentName } satisfies zodPlugin.ZodPluginConfig },
        ]),
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Operations
    // ────────────────────────────────────────────────────────────────────────────

    for (const operationDef of getOperationDefinitions(baseConfig.documents)) {
      const operationType = operationDef.operation;
      const operationName = operationDef.name?.value;
      if (!operationName) continue;

      sections.push(
        section(`operations/${operationName}.${operationType}.ts`, [
          {
            zod: {
              mode: "operation",
              operationType,
              operationName,
            } satisfies zodPlugin.ZodPluginConfig,
          },
        ]),
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Registry
    // ────────────────────────────────────────────────────────────────────────────

    sections.push(
      section(outputName, [{ zod: { mode: "registry" } satisfies zodPlugin.ZodPluginConfig }]),
    );

    // ────────────────────────────────────────────────────────────────────────────
    // Types
    // ────────────────────────────────────────────────────────────────────────────

    sections.push(
      section("types.d.ts", [{ zod: { mode: "types" } satisfies zodPlugin.ZodPluginConfig }]),
    );

    return sections;
  },
};

export default preset;
