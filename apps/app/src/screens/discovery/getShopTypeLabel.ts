import { webShopDirectory } from "@mobile/design/webDesignParity";

export function getShopTypeLabel(shopType: string) {
  return (
    webShopDirectory.shopTypePills.find((pill) => pill.value === shopType)?.label ?? "Standard"
  );
}
