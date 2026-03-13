/** Canonical list of directive and renderer capabilities. */
export const capabilityList = [
  // I/O capabilities.
  "io:input",
  "io:output",
  // Type capabilities.
  "type:scalar",
  "type:enum",
  "type:object",
  "type:list",
  "type:union",
  // Fragment capabilities.
  "fragment:named",
  "fragment:inline",
  // Nullability capabilities.
  "null:allowed",
  "null:rejected",
  // Optionality capabilities.
  "optional:allowed",
  "optional:rejected",
  // Transform capabilities.
  "transform:allowed",
  "transform:rejected",
] as const;

/** Capability literal supported by nodes and directives. */
export type Capability = (typeof capabilityList)[number];

/** Declarative capability changes performed by a directive. */
export type CapabilityTransition = {
  adds?: readonly Capability[];
  removes?: readonly Capability[];
};

const capabilityLookup = new Set<Capability>(capabilityList);

function getCapabilityGroupPrefix(capability: Capability | string): `${string}:` {
  const [groupName] = capability.split(":");
  return `${groupName}:`;
}

function selectCapabilitiesByPrefix(
  current: ReadonlySet<Capability>,
  prefix: `${string}:`,
): Capability[] {
  return [...current].filter((capability) => capability.startsWith(prefix)) as Capability[];
}

function formatCapabilities(capabilities: readonly Capability[]): string {
  return capabilities.length === 0 ? "none" : capabilities.join(", ");
}

function assertExactlyOneCapability(groupName: string, capabilities: readonly Capability[]): void {
  if (capabilities.length !== 1) {
    throw new Error(
      `expected exactly one ${groupName}:* capability, found ${formatCapabilities(capabilities)}`,
    );
  }
}

function assertAtMostOneCapability(groupName: string, capabilities: readonly Capability[]): void {
  if (capabilities.length > 1) {
    throw new Error(
      `expected at most one ${groupName}:* capability, found ${formatCapabilities(capabilities)}`,
    );
  }
}

/** Selects all `io:*` capabilities from a capability set. */
export function selectIoCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "io:");
}

/** Selects all `type:*` capabilities from a capability set. */
export function selectTypeCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "type:");
}

/** Selects all `fragment:*` capabilities from a capability set. */
export function selectFragmentCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "fragment:");
}

/** Selects all `null:*` capabilities from a capability set. */
export function selectNullCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "null:");
}

/** Selects all `optional:*` capabilities from a capability set. */
export function selectOptionalCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "optional:");
}

/** Selects all `transform:*` capabilities from a capability set. */
export function selectTransformCapabilities(current: ReadonlySet<Capability>): Capability[] {
  return selectCapabilitiesByPrefix(current, "transform:");
}

/**
 * Checks whether a node supports all required capabilities.
 *
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

/** Compares two capability sets by value. */
export function areCapabilitySetsEqual(
  left: ReadonlySet<Capability>,
  right: ReadonlySet<Capability>,
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  return [...left].every((capability) => right.has(capability));
}

/** Ensures a resolver-node capability set respects the exclusive groups. */
export function assertNodeCapabilityInvariants(current: ReadonlySet<Capability>): void {
  assertExactlyOneCapability("io", selectIoCapabilities(current));
  assertExactlyOneCapability("type", selectTypeCapabilities(current));
  assertExactlyOneCapability("null", selectNullCapabilities(current));
  assertAtMostOneCapability("fragment", selectFragmentCapabilities(current));
}

/** Ensures a pipeline-state capability set respects the exclusive groups. */
export function assertStateCapabilityInvariants(current: ReadonlySet<Capability>): void {
  assertExactlyOneCapability("io", selectIoCapabilities(current));
  assertExactlyOneCapability("type", selectTypeCapabilities(current));
  assertAtMostOneCapability("fragment", selectFragmentCapabilities(current));
  assertExactlyOneCapability("null", selectNullCapabilities(current));
  assertExactlyOneCapability("optional", selectOptionalCapabilities(current));
  assertExactlyOneCapability("transform", selectTransformCapabilities(current));
}

/** Validates a declarative capability transition against the current state. */
export function validateCapabilityTransition(
  current: ReadonlySet<Capability>,
  transition: CapabilityTransition,
): void {
  const adds = transition.adds ?? [];
  const removes = transition.removes ?? [];

  for (const capability of adds) {
    if (!capabilityLookup.has(capability)) {
      throw new Error(`unknown capability "${capability}" in adds`);
    }
  }

  for (const capability of removes) {
    if (!capabilityLookup.has(capability)) {
      throw new Error(`unknown capability "${capability}" in removes`);
    }
  }

  const overlapping = adds.filter((capability) => removes.includes(capability));
  if (overlapping.length > 0) {
    throw new Error(`capability appears in both adds and removes: ${overlapping.join(", ")}`);
  }

  for (const capability of removes) {
    if (current.has(capability)) {
      continue;
    }

    const groupPrefix = getCapabilityGroupPrefix(capability);
    const alreadySatisfiedByAdd = adds.some(
      (addedCapability) => addedCapability.startsWith(groupPrefix) && current.has(addedCapability),
    );

    if (!alreadySatisfiedByAdd) {
      throw new Error(`cannot remove absent capability "${capability}"`);
    }
  }
}

/** Applies a validated declarative capability transition to a capability set. */
export function applyCapabilityTransition(
  current: ReadonlySet<Capability>,
  transition: CapabilityTransition,
): Set<Capability> {
  const next = new Set(current);

  for (const capability of transition.removes ?? []) {
    next.delete(capability);
  }

  for (const capability of transition.adds ?? []) {
    next.add(capability);
  }

  return next;
}
