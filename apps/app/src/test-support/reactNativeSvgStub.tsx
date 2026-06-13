// react-native-svg ships ESM (value-position `typeof`) that the rolldown/oxc transform
// rejects under the render harness — same class of issue as the phosphor stub. Map every
// svg primitive to a passthrough View (containers) or null (leaf shapes) so components that
// draw with react-native-svg mount in happy-dom without parsing the real package.
import { createElement, type ReactNode } from "react";
import { View } from "react-native";

const Container = ({ children }: { children?: ReactNode }) => createElement(View, null, children);
const Leaf = () => null;

export const Svg = Container;
export const G = Container;
export const Defs = Container;
export const LinearGradient = Container;
export const RadialGradient = Container;
export const ClipPath = Container;
export const Mask = Container;
export const Circle = Leaf;
export const Ellipse = Leaf;
export const Rect = Leaf;
export const Path = Leaf;
export const Line = Leaf;
export const Polygon = Leaf;
export const Polyline = Leaf;
export const Stop = Leaf;
export const Text = Leaf;
export const TSpan = Leaf;
export const Use = Leaf;

export default Svg;
