import { describe, expect, it } from "vitest";

import { preset } from "../src/preset";

describe("preset", () => {
  it("returns an empty generate section list", async () => {
    await expect(preset.buildGeneratesSection({} as never)).resolves.toEqual([]);
  });
});
