import { HomeIcon, bottomNavIcons, homeIconStrokeWidth } from "./homeAssets";
import { useHomeScreenColors } from "./homeScreenHooks";

export function BottomNavIcon({
  active,
  emphasized,
  name,
}: {
  active: boolean;
  emphasized: boolean;
  name: string;
}) {
  const colors = useHomeScreenColors();
  const Icon = bottomNavIcons[name] ?? HomeIcon;
  const color = emphasized ? colors.white : active ? colors.primaryDark : colors.muted;

  return <Icon color={color} size={emphasized ? 28 : 24} strokeWidth={homeIconStrokeWidth} />;
}
