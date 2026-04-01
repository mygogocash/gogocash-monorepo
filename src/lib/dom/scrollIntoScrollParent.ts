/**
 * Finds the nearest ancestor that can scroll on the Y axis (overflow-y auto/scroll).
 * Used for in-page hash links inside nested scroll containers (e.g. profile SubPage).
 */
export function findVerticalScrollContainer(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

const DEFAULT_TOP_PADDING = 12;

/**
 * Scrolls so `element` is near the top of its nearest scrollable ancestor; falls back to
 * `Element.scrollIntoView` when none is found.
 */
export function scrollElementIntoNearestScrollParent(
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior; topPadding?: number }
): void {
  const behavior = options?.behavior ?? "smooth";
  const topPadding = options?.topPadding ?? DEFAULT_TOP_PADDING;
  const scrollParent = findVerticalScrollContainer(element);
  if (!scrollParent) {
    element.scrollIntoView({ behavior, block: "start" });
    return;
  }
  const elTop = element.getBoundingClientRect().top;
  const parentTop = scrollParent.getBoundingClientRect().top;
  const nextTop = elTop - parentTop + scrollParent.scrollTop - topPadding;
  scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior });
}
