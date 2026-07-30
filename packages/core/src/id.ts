let counter = 0;

/** Deterministic-enough IDs for local/dev; replace with UUIDs at the edge later. */
export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Reset for unit tests. */
export function resetIdCounter(): void {
  counter = 0;
}
