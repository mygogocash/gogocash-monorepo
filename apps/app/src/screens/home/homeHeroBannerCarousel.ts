export function normalizeBannerIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return ((index % count) + count) % count;
}

export function nextBannerIndex(current: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return normalizeBannerIndex(current + 1, count);
}

export function prevBannerIndex(current: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return normalizeBannerIndex(current - 1, count);
}

export function buildLoopedHeroBannerSlides<T>(items: readonly T[]) {
  if (items.length <= 1) {
    return { slides: [...items], startIndex: 0 };
  }

  const last = items[items.length - 1];
  const first = items[0];

  return {
    slides: [last, ...items, first],
    startIndex: 1,
  };
}

export function getLoopedHeroBannerActiveIndex(extendedIndex: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return normalizeBannerIndex(extendedIndex - 1, count);
}

export function resolveLoopedHeroBannerJumpTarget(extendedIndex: number, count: number) {
  if (count <= 1) {
    return null;
  }

  if (extendedIndex === 0) {
    return count;
  }

  if (extendedIndex === count + 1) {
    return 1;
  }

  return null;
}

export function getLoopedHeroBannerDotScrollX(
  contentOffsetX: number,
  pageWidth: number,
  count: number
) {
  if (count <= 1 || pageWidth <= 0) {
    return 0;
  }

  const virtualOffset = contentOffsetX - pageWidth;
  const loopSpan = count * pageWidth;

  return ((virtualOffset % loopSpan) + loopSpan) % loopSpan;
}

export function getLoopedHeroBannerAutoAdvanceTarget(
  currentIndex: number,
  count: number
) {
  if (count <= 1) {
    return { extendedIndex: 0, activeIndex: 0 };
  }

  const nextIndex = nextBannerIndex(currentIndex, count);
  const wrapsForward = nextIndex === 0 && currentIndex === count - 1;

  return {
    activeIndex: nextIndex,
    extendedIndex: wrapsForward ? count + 1 : nextIndex + 1,
  };
}
