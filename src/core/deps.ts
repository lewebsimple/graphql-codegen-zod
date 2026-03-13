/** Identifies a generated module dependency. */
export type DepIdentifier = {
  /** Symbol or artifact name. */
  name: string;
  /** Dependency category used for import generation. */
  kind: "document" | "enum" | "fragment" | "query" | "mutation" | "subscription";
};

/**
 * Builds a stable string key for a dependency.

 * @param dep Dependency descriptor.
 * @returns Stable key combining dependency kind and name.
 */
export function getDepKey(dep: DepIdentifier): string {
  return `${dep.kind}:${dep.name}`;
}

/**
 * Merges dependencies into a target set without duplicating logical entries.

 * @param target Target dependency set to mutate.
 * @param source Source dependencies to merge in.
 * @returns The mutated target set.
 */
export function mergeDeps(
  target: Set<DepIdentifier>,
  source: Iterable<DepIdentifier>,
): Set<DepIdentifier> {
  const seen = new Set<string>([...target].map(getDepKey));

  for (const dep of source) {
    const key = getDepKey(dep);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    target.add(dep);
  }

  return target;
}
