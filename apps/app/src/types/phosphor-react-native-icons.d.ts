declare module "phosphor-react-native/lib/module/icons/*" {
  import type { ComponentType } from "react";
  import type { StyleProp, TextStyle, ViewStyle } from "react-native";

  export type PhosphorIconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

  export type PhosphorIconProps = {
    color?: string;
    duotoneColor?: string;
    duotoneOpacity?: number;
    mirrored?: boolean;
    size?: number | string;
    style?: StyleProp<ViewStyle | Omit<TextStyle, "cursor">>;
    testID?: string;
    title?: string;
    titleId?: string;
    weight?: PhosphorIconWeight;
  };

  const Icon: ComponentType<PhosphorIconProps>;
  export default Icon;
}
