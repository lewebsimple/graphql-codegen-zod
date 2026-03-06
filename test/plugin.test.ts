import { describe, expect, it } from "vitest";

import * as zodPlugin from "../src/plugin";

describe("plugin", () => {
  it("exports plugin entrypoint in codegen-compatible shape", () => {
    expect(typeof zodPlugin.plugin).toBe("function");
  });
});
