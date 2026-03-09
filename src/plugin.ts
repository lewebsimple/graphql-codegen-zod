import type { PluginFunction } from "@graphql-codegen/plugin-helpers";
import type { OperationTypeNode } from "graphql";

import { getEnumPluginOutput } from "./lib/enum";
import { getFragmentPluginOutput } from "./lib/fragment";
import { getOperationPluginOutput } from "./lib/operation";
import { getRegistryPluginOutput } from "./lib/registry";

/** Runtime config accepted by the Zod codegen plugin. */
export type ZodPluginConfig =
  | { mode: "enum"; enumName: string }
  | { mode: "fragment"; fragmentName: string }
  | { mode: "operation"; operationType: OperationTypeNode; operationName: string }
  | { mode: "registry" };

/**
 * GraphQL Code Generator plugin entry point.
 * @param schema GraphQL schema.
 * @param documents Parsed GraphQL documents.
 * @param config Plugin mode/configuration.
 * @returns Generated module source content.
 */
export const plugin: PluginFunction<ZodPluginConfig> = (schema, documents, config) => {
  switch (config.mode) {
    case "enum":
      return getEnumPluginOutput({ schema, ...config });

    case "fragment":
      return getFragmentPluginOutput({ schema, documents, ...config });

    case "operation":
      return getOperationPluginOutput({ schema, documents, ...config });

    case "registry":
      return getRegistryPluginOutput({ schema, documents, ...config });
  }
};
