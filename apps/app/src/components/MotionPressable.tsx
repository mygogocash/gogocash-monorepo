import {
  type MouseEvent,
  Pressable,
  StyleSheet,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useState } from "react";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { getInteractionTransformStyle, getPressedScaleStyle, motion } from "@mobile/theme/motion";

type MotionPressableProps = PressableProps & {
  hoverLift?: boolean;
  pressScale?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

type WebMotionStyle = ViewStyle & {
  boxShadow?: string;
  cursor?: string;
  transitionDuration?: string;
  transitionProperty?: string;
  transitionTimingFunction?: string;
  willChange?: string;
};

const webInteractiveStyle: WebMotionStyle = {
  cursor: "pointer",
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: motion.cssTransition.property,
  transitionTimingFunction: motion.cssTransition.timingFunction,
  willChange: "transform",
};

const restingHoverStyle: WebMotionStyle = {
  boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
};

const hoverLiftStyle: WebMotionStyle = {
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
};

export function MotionPressable({
  disabled,
  hoverLift = true,
  onHoverIn,
  onHoverOut,
  pressScale = motion.scale.press,
  style,
  ...pressableProps
}: MotionPressableProps) {
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const interactive = !disabled;
  // Reduce-motion (A1): collapse the press-scale to the identity (1) so the press
  // applies its final state instantly with no scale animation, and drop the
  // hover-lift translate/shadow. Public props are unchanged — this is internal.
  const effectivePressScale = reducedMotion ? 1 : pressScale;
  const effectiveHoverLift = reducedMotion ? false : hoverLift;

  const handleHoverIn = (event: MouseEvent) => {
    if (interactive) {
      setHovered(true);
    }
    onHoverIn?.(event);
  };

  const handleHoverOut = (event: MouseEvent) => {
    setHovered(false);
    onHoverOut?.(event);
  };

  return (
    <Pressable
      disabled={disabled}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      {...pressableProps}
      style={(state) =>
        StyleSheet.flatten([
          webInteractiveStyle,
          effectiveHoverLift ? restingHoverStyle : null,
          typeof style === "function" ? style(state) : style,
          interactive && effectiveHoverLift && hovered ? hoverLiftStyle : null,
          effectiveHoverLift
            ? getInteractionTransformStyle({
                hovered: interactive && hovered,
                hoverLift: effectiveHoverLift,
                pressed: state.pressed,
                pressScale: effectivePressScale,
              })
            : getPressedScaleStyle(state.pressed, effectivePressScale),
        ])
      }
    />
  );
}
