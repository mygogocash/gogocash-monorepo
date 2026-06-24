import { CustomerBrandDirectoryScreen } from "./discovery/CustomerBrandDirectoryScreen";
import { CustomerCategoryDirectoryScreen } from "./discovery/CustomerCategoryDirectoryScreen";
import { CustomerProductDiscoveryScreen } from "./discovery/CustomerProductDiscoveryScreen";
import { CustomerShopDirectoryScreen } from "./discovery/CustomerShopDirectoryScreen";
import { type DiscoveryVariant } from "./discovery/discoveryTypes";

export type { DiscoveryVariant };

export function CustomerDiscoveryScreen({ routeId }: { routeId: DiscoveryVariant }) {
  switch (routeId) {
    case "brand":
      return <CustomerBrandDirectoryScreen />;
    case "category":
      return <CustomerCategoryDirectoryScreen />;
    case "discover":
      return <CustomerProductDiscoveryScreen />;
    case "shops":
      return <CustomerShopDirectoryScreen />;
    default: {
      const _exhaustive: never = routeId;
      return _exhaustive;
    }
  }
}
