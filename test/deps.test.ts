import { describe, expect, it } from "vitest";

import { getDepSchemaIdentifier } from "../src/generator/deps";

describe("deps", () => {
  it("builds identifiers for enum and fragment schemas", () => {
    expect(getDepSchemaIdentifier({ name: "UserRole", kind: "enum" })).toBe(
      "zodUserRoleEnumSchema",
    );
    expect(getDepSchemaIdentifier({ name: "Viewer", kind: "fragment" })).toBe(
      "zodViewerFragmentSchema",
    );
  });

  it("builds identifiers for operation result and variables schemas", () => {
    expect(getDepSchemaIdentifier({ name: "GetUser", kind: "query", target: "result" })).toBe(
      "zodGetUserResultSchema",
    );
    expect(getDepSchemaIdentifier({ name: "GetUser", kind: "query", target: "variables" })).toBe(
      "zodGetUserVariablesSchema",
    );
  });
});
