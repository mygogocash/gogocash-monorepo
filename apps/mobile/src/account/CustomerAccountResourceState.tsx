import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import type { CustomerAccountResourceResult } from "@mobile/account/customerAccountResource";

export function CustomerAccountResourceState({
  emptyBody,
  emptyTitle,
  resource,
  resourceLabel,
}: {
  emptyBody?: string;
  emptyTitle?: string;
  resource: CustomerAccountResourceResult<unknown>;
  resourceLabel: string;
}) {
  if (resource.status === "ready") {
    return null;
  }

  if (resource.status === "loading") {
    return (
      <CustomerRouteState
        body={`Fetching the latest ${resourceLabel} from GoGoCash.`}
        title={`Loading ${resourceLabel}`}
        variant="loading"
      />
    );
  }

  if (resource.status === "empty") {
    return (
      <CustomerRouteState
        body={emptyBody ?? `There is no ${resourceLabel} to show yet.`}
        title={emptyTitle ?? `No ${resourceLabel} yet`}
        variant="empty"
      />
    );
  }

  if (resource.status === "offline") {
    return (
      <CustomerRouteState
        action={{ label: "Try again", onPress: resource.retry }}
        body={`Reconnect to the internet, then reload your ${resourceLabel}.`}
        title="You are offline"
        variant="offline"
      />
    );
  }

  return (
    <CustomerRouteState
      action={
        resource.status === "error" ? { label: "Try again", onPress: resource.retry } : undefined
      }
      body={
        resource.status === "disabled"
          ? "Backend account data is disabled for this environment."
          : `GoGoCash could not load your ${resourceLabel}.`
      }
      title={
        resource.status === "disabled"
          ? "Account data unavailable"
          : `We could not load ${resourceLabel}`
      }
      variant="error"
    />
  );
}
