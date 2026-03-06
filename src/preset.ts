import { basename, dirname, join } from "node:path";

import * as addPlugin from "@graphql-codegen/add";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as zodPlugin from "./plugin";
import type { Types } from "@graphql-codegen/plugin-helpers";
import { getEnumTypes } from "./lib/enum";
import { buildASTSchema } from "graphql";

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
        plugins: [{ zod: { kind: "registry" } satisfies zodPlugin.ZodPluginConfig }],
      },
    ];

    // enums
    const enumNames = getEnumTypes(baseConfig.schemaAst).map(({ name }) => name);
    for (const enumName of enumNames) {
      sections.push({
        ...baseConfig,
        filename: join(outputDir, `enums/${enumName}.ts`),
        plugins: [{ zod: { kind: "enum", enumName } satisfies zodPlugin.ZodPluginConfig }],
      });
    }

    return sections;
  },
};

export default preset;
