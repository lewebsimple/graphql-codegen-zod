import type { PluginFunction } from "@graphql-codegen/plugin-helpers";

export type ZodPluginConfig = {};

export const plugin: PluginFunction<ZodPluginConfig> = (_schema, _documents, _config) => {
  return "";
};
