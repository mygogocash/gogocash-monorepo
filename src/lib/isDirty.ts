/**
 * Structural deep-equality for form snapshots (plain objects, arrays, and
 * primitives). Used to drive "disable Save until something changed".
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  // Dates have no own enumerable keys, so the key-walk below would treat any two
  // as equal; compare by timestamp instead.
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr && bArr) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
  );
}

/**
 * True when `current` differs from the `initial` snapshot — i.e. the form has
 * unsaved changes. Pair with a Save button: `disabled={!isDirty(values, initial)}`.
 */
export function isDirty(current: unknown, initial: unknown): boolean {
  return !deepEqual(current, initial);
}
