import { basename, dirname, join } from "node:path";

import * as addPlugin from "@graphql-codegen/add";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as zodPlugin from "./plugin";
import type { Types } from "@graphql-codegen/plugin-helpers";
import { getEnumTypes } from "./lib/enum";
import { buildASTSchema } from "graphql";
import { getFragmentDefinitions } from "./lib/fragment";
import { getOperationDefinitions } from "./lib/operation";

export const preset: Types.OutputPreset = {
  buildGeneratesSection: async (options) => {
    const baseConfig = {
      config: {
        ...options.config,
        avoidOptionals: {
          defaultValue: false,
          field: true,
          inputValue: false,
          object: true,
        },
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

    const outputDir = dirname(options.baseOutputDir);
    const outputName = basename(options.baseOutputDir);

    const sections: Types.GenerateOptions[] = [
      // typescript / typescript-operations
      {
        ...baseConfig,
        filename: join(outputDir, "types.ts"),
        plugins: [
          {
            typescript: {},
          },
          {
            typescriptOperations: {},
          },
        ],
      },

      // typed-document-node
      {
        ...baseConfig,
        filename: join(outputDir, "documents.ts"),
        plugins: [
          { add: { content: `import type * as Types from "./types";\n` } },
          {
            typedDocumentNode: {
              importOperationTypesFrom: "./types",
            },
          },
        ],
      },

      // zod
      {
        ...baseConfig,
        filename: join(outputDir, outputName),
        plugins: [{ zod: { mode: "registry" } satisfies zodPlugin.ZodPluginConfig }],
      },
    ];

    // enums
    const enumTypes = getEnumTypes(baseConfig.schemaAst);
    for (const { name: enumName } of enumTypes) {
      sections.push({
        ...baseConfig,
        filename: join(outputDir, `enums/${enumName}.ts`),
        plugins: [{ zod: { mode: "enum", enumName } satisfies zodPlugin.ZodPluginConfig }],
      });
    }

    // fragments
    const fragmentDefs = getFragmentDefinitions(baseConfig.documents);
    for (const fragmentDef of fragmentDefs) {
      const fragmentName = fragmentDef.name.value;
      sections.push({
        ...baseConfig,
        filename: join(outputDir, `fragments/${fragmentName}.ts`),
        plugins: [{ zod: { mode: "fragment", fragmentName } satisfies zodPlugin.ZodPluginConfig }],
      });
    }

    // operations
    const operationDefs = getOperationDefinitions(baseConfig.documents);
    for (const operationDef of operationDefs) {
      const operationName = operationDef.name?.value;
      const operationType = operationDef.operation;
      if (!operationName) continue;
      sections.push({
        ...baseConfig,
        filename: join(outputDir, `operations/${operationName}.ts`),
        plugins: [
          {
            zod: {
              mode: "operation",
              operationType,
              operationName,
            } satisfies zodPlugin.ZodPluginConfig,
          },
        ],
      });
    }

    return sections;
  },
};

export default preset;
