/**
 * Move the item at `from` to position `to`, returning a NEW array (the input is
 * never mutated). Out-of-range indices or a no-op (`from === to`) return an
 * unchanged copy. Used for drag-and-drop list reordering.
 */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list.slice();
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
