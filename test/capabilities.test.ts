import { describe, expect, it } from "vitest";

import {
  applyCapabilityTransition,
  assertNodeCapabilityInvariants,
  assertStateCapabilityInvariants,
  validateCapabilityTransition,
  type Capability,
} from "../src/core/capabilities";

describe("capability guardrails", () => {
  it("accepts valid resolver-node capability sets", () => {
    expect(() =>
      assertNodeCapabilityInvariants(
        new Set<Capability>(["io:output", "type:object", "fragment:inline", "null:rejected"]),
      ),
    ).not.toThrow();
  });

  it("accepts valid pipeline-state capability sets", () => {
    expect(() =>
      assertStateCapabilityInvariants(
        new Set<Capability>([
          "io:input",
          "type:scalar",
          "null:allowed",
          "optional:allowed",
          "transform:allowed",
        ]),
      ),
    ).not.toThrow();
  });

  it("fails when an exclusive node group has multiple values", () => {
    expect(() =>
      assertNodeCapabilityInvariants(
        new Set<Capability>(["io:input", "io:output", "type:scalar", "null:allowed"]),
      ),
    ).toThrowError("expected exactly one io:* capability, found io:input, io:output");
  });

  it("fails when a required state group is missing", () => {
    expect(() =>
      assertStateCapabilityInvariants(
        new Set<Capability>(["io:output", "type:scalar", "null:allowed", "transform:allowed"]),
      ),
    ).toThrowError("expected exactly one optional:* capability, found none");
  });

  it("fails when a transition references an unknown capability", () => {
    expect(() =>
      validateCapabilityTransition(new Set<Capability>(["null:allowed"]), {
        adds: ["type:missing" as Capability],
      }),
    ).toThrowError('unknown capability "type:missing" in adds');
  });

  it("fails when a capability appears in both adds and removes", () => {
    expect(() =>
      validateCapabilityTransition(new Set<Capability>(["null:allowed"]), {
        adds: ["null:allowed"],
        removes: ["null:allowed"],
      }),
    ).toThrowError("capability appears in both adds and removes: null:allowed");
  });

  it("fails when removing an absent capability without an already-satisfied replacement", () => {
    expect(() =>
      validateCapabilityTransition(new Set<Capability>(["null:rejected"]), {
        removes: ["null:allowed"],
      }),
    ).toThrowError('cannot remove absent capability "null:allowed"');
  });

  it("applies a valid nullability swap transition", () => {
    const current = new Set<Capability>([
      "io:output",
      "type:scalar",
      "null:allowed",
      "optional:rejected",
      "transform:allowed",
    ]);

    expect(() =>
      validateCapabilityTransition(current, {
        removes: ["null:allowed"],
        adds: ["null:rejected"],
      }),
    ).not.toThrow();

    const next = applyCapabilityTransition(current, {
      removes: ["null:allowed"],
      adds: ["null:rejected"],
    });

    expect(next.has("null:allowed")).toBe(false);
    expect(next.has("null:rejected")).toBe(true);
  });
});
