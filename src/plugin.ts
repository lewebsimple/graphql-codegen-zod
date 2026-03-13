import type { PluginFunction } from "@graphql-codegen/plugin-helpers";
import type { OperationTypeNode } from "graphql";

import { getEnumPluginOutput } from "./generator/enum";
import { getFragmentPluginOutput } from "./generator/fragment";
import { getOperationPluginOutput } from "./generator/operation";
import { getRegistryPluginOutput } from "./generator/registry";
import { getTypesPluginOutput } from "./generator/types";

/** Plugin config for enum generation mode. */
export type EnumPluginConfig = {
  /** Generation mode selector. */
  mode: "enum";
  /** Enum type name to generate. */
  enumName: string;
};

/** Plugin config for fragment generation mode. */
export type FragmentPluginConfig = {
  /** Generation mode selector. */
  mode: "fragment";
  /** Fragment name to generate. */
  fragmentName: string;
};

/** Plugin config for operation generation mode. */
export type OperationPluginConfig = {
  /** Generation mode selector. */
  mode: "operation";
  /** Operation kind to generate. */
  operationType: OperationTypeNode;
  /** Operation name to generate. */
  operationName: string;
};

/** Plugin config for registry generation mode. */
export type RegistryPluginConfig = {
  /** Generation mode selector. */
  mode: "registry";
};

/** Plugin config for type barrel generation mode. */
export type TypesPluginConfig = {
  /** Generation mode selector. */
  mode: "types";
};

/** Runtime config accepted by the Zod codegen plugin. */
export type ZodPluginConfig =
  | EnumPluginConfig
  | FragmentPluginConfig
  | OperationPluginConfig
  | RegistryPluginConfig
  | TypesPluginConfig;

/**
 * GraphQL Code Generator plugin entry point.
 *
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

    case "types":
      return getTypesPluginOutput({ schema, documents, ...config });
  }
};
