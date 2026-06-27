function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sampleValues = Array.from({ length: 11 }, (_, index) => calcBezier(index * 0.1, x1, x2));

  function a(a1: number, a2: number) {
    return 1 - 3 * a2 + 3 * a1;
  }

  function b(a1: number, a2: number) {
    return 3 * a2 - 6 * a1;
  }

  function c(a1: number) {
    return 3 * a1;
  }

  function calcBezier(t: number, a1: number, a2: number) {
    return ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  }

  function getSlope(t: number, a1: number, a2: number) {
    return 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  }

  function getTForX(x: number) {
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = sampleValues.length - 1;

    for (
      ;
      currentSample !== lastSample && sampleValues[currentSample] <= x;
      currentSample += 1
    ) {
      intervalStart += 0.1;
    }

    currentSample -= 1;

    const distance =
      (x - sampleValues[currentSample]) /
      (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guessForT = intervalStart + distance * 0.1;

    for (let index = 0; index < 4; index += 1) {
      const currentSlope = getSlope(guessForT, x1, x2);

      if (currentSlope === 0) {
        return guessForT;
      }

      const currentX = calcBezier(guessForT, x1, x2) - x;
      guessForT -= currentX / currentSlope;
    }

    return guessForT;
  }

  return (x: number) => {
    if (x1 === y1 && x2 === y2) {
      return x;
    }

    if (x === 0 || x === 1) {
      return x;
    }

    return calcBezier(getTForX(x), y1, y2);
  };
}

const isWebRuntime =
  typeof (globalThis as typeof globalThis & { document?: unknown }).document !== "undefined";

export const motion = {
  useNativeDriver: !isWebRuntime,
  /** Height/width/layout animations cannot use the native driver. */
  useLayoutNativeDriver: false,
  cssTransition: {
    duration: "220ms",
    property: "transform, box-shadow, opacity, background-color, border-color, color",
    timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  duration: {
    fast: 140,
    base: 220,
    emphasis: 320,
    heroAutoplayDelay: 3000,
    accordionChevron: 280,
    accordionExpand: 300,
    scorePulse: 1000,
    shimmer: 1500,
  },
  easing: {
    in: cubicBezier(0.4, 0, 1, 1),
    out: cubicBezier(0.16, 1, 0.3, 1),
    spring: cubicBezier(0.34, 1.56, 0.64, 1),
    standard: cubicBezier(0.4, 0, 0.2, 1),
  },
  scale: {
    hoverLiftY: -2,
    imageHover: 1.03,
    press: 0.97,
    subtlePress: 0.98,
  },
  staggerStep: 50,
} as const;

type InteractionTransformOptions = {
  hoverLift?: boolean;
  hovered?: boolean;
  pressed?: boolean;
  pressScale?: number;
};

export function getInteractionTransformStyle({
  hoverLift = false,
  hovered = false,
  pressed = false,
  pressScale = motion.scale.press,
}: InteractionTransformOptions) {
  const transform = [];

  if (hoverLift) {
    transform.push({ translateY: hovered ? motion.scale.hoverLiftY : 0 });
  }

  transform.push({ scale: pressed ? pressScale : 1 });

  return { transform };
}

export function getPressedScaleStyle(pressed: boolean, scale: number = motion.scale.press) {
  return getInteractionTransformStyle({ pressed, pressScale: scale });
}
