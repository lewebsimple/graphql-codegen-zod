/** Canonical list of directive and renderer capabilities. */
export const capabilityList = [
  "scalar",
  "object",
  "enum",
  "list",
  "union",
  "nullable",
  "optional",
  "input",
  "output",
  "inline-fragment",
] as const;

/** Capability literal supported by nodes and directives. */
export type Capability = (typeof capabilityList)[number];

/**
 * Checks whether a node supports all required capabilities.

 * @param current Capabilities currently available on the node.
 * @param required Capabilities required by an operation or directive.
 * @returns `true` when all required capabilities are present.
 */
export function hasCapabilities(
  current: ReadonlySet<Capability>,
  required: readonly Capability[],
): boolean {
  return required.every((capability) => current.has(capability));
}
