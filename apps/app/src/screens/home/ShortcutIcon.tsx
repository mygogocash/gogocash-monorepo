import { ShoppingBagIcon, shortcutIcons, homeIconStrokeWidth } from "./homeAssets";
import { useHomeScreenColors } from "./homeScreenHooks";

export function ShortcutIcon({ name }: { name: string }) {
  const colors = useHomeScreenColors();
  const Icon = shortcutIcons[name] ?? ShoppingBagIcon;

  return <Icon color={colors.primaryDark} size={18} strokeWidth={homeIconStrokeWidth} />;
}
