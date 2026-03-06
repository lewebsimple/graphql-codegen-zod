import type { Types } from "@graphql-codegen/plugin-helpers";

export const preset: Types.OutputPreset = {
  buildGeneratesSection: async (_options) => {
    const sections: Types.GenerateOptions[] = [];
    return sections;
  },
};
