import { webDesktopHeaderNavItems } from "@mobile/design/webDesignParity";
import { desktopNavIcons } from "./homeAssets";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function DesktopCategoryNavIcon({
  active,
  name,
}: {
  active: boolean;
  name: (typeof webDesktopHeaderNavItems)[number]["icon"];
}) {
  const styles = useHomeScreenStyles();
  if (name === "none") {
    return null;
  }

  const IconComponent = desktopNavIcons[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      color={active ? "#00B14F" : "#3B3B3B"}
      size={16}
      style={styles.desktopCategoryNavIcon}
      weight="regular"
    />
  );
}
