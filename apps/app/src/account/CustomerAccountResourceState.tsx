import { useContext, type ReactNode } from "react";
import { IntlContext, type MessageDescriptor } from "react-intl";

import { ApiError } from "@mobile/api/client";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import type { CustomerAccountResourceResult } from "@mobile/account/customerAccountResource";

// Localized labels for the `resourceLabel` values callers pass in (e.g. "wallet" -> Thai "กระเป๋าเงิน").
// Keyed by the English label; `defaultMessage` keeps the English correct and also covers the
// no-IntlProvider path. Unknown labels fall back to the raw value verbatim.
const RESOURCE_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  billing: { defaultMessage: "billing", id: "mobileResourceLabelBilling" },
  "merchant details": {
    defaultMessage: "merchant details",
    id: "mobileResourceLabelMerchantDetails",
  },
  offers: { defaultMessage: "offers", id: "mobileResourceLabelOffers" },
  profile: { defaultMessage: "profile", id: "mobileResourceLabelProfile" },
  "referral activity": {
    defaultMessage: "referral activity",
    id: "mobileResourceLabelReferralActivity",
  },
  wallet: { defaultMessage: "wallet", id: "mobileResourceLabelWallet" },
};

// Substitute the single {label} ICU placeholder for the no-IntlProvider fallback path. react-intl
// does the real formatting when a provider is mounted (the real app); this only runs in isolation.
function fillLabel(template: string, label: string): string {
  return template.replace(/\{label\}/g, label);
}

export function CustomerAccountResourceState({
  embedded = false,
  emptyBody,
  emptyTitle,
  loadingSkeleton,
  resource,
  resourceLabel,
}: {
  embedded?: boolean;
  emptyBody?: string;
  emptyTitle?: string;
  loadingSkeleton?: ReactNode;
  resource: CustomerAccountResourceResult<unknown>;
  resourceLabel: string;
}) {
  // Reading IntlContext directly (not useIntl()) is non-throwing, so this still renders when mounted
  // outside a provider; in that case we fall back to the English defaultMessage with manual {label}.
  const intl = useContext(IntlContext);

  if (resource.status === "ready") {
    return null;
  }

  const labelDescriptor = RESOURCE_LABEL_MESSAGES[resourceLabel];
  const label =
    intl && labelDescriptor
      ? intl.formatMessage(labelDescriptor)
      : (labelDescriptor?.defaultMessage as string | undefined) ?? resourceLabel;

  const format = (descriptor: MessageDescriptor): string =>
    intl
      ? intl.formatMessage(descriptor, { label })
      : fillLabel(descriptor.defaultMessage as string, label);

  if (resource.status === "loading") {
    return (
      <CustomerRouteState
        body={format({
          defaultMessage: "Fetching the latest {label} from GoGoCash.",
          id: "mobileResourceLoadingBody",
        })}
        embedded={embedded}
        loadingSkeleton={loadingSkeleton}
        title={format({ defaultMessage: "Loading {label}", id: "mobileResourceLoadingTitle" })}
        variant="loading"
      />
    );
  }

  if (resource.status === "empty") {
    return (
      <CustomerRouteState
        body={
          emptyBody ??
          format({ defaultMessage: "There is no {label} to show yet.", id: "mobileResourceEmptyBody" })
        }
        embedded={embedded}
        title={
          emptyTitle ?? format({ defaultMessage: "No {label} yet", id: "mobileResourceEmptyTitle" })
        }
        variant="empty"
      />
    );
  }

  if (resource.status === "offline") {
    return (
      <CustomerRouteState
        action={{
          label: format({ defaultMessage: "Try again", id: "mobileResourceRetry" }),
          onPress: resource.retry,
        }}
        body={format({
          defaultMessage: "Reconnect to the internet, then reload your {label}.",
          id: "mobileResourceOfflineBody",
        })}
        embedded={embedded}
        title={format({ defaultMessage: "You are offline", id: "mobileStateOfflineTitle" })}
        variant="offline"
      />
    );
  }

  return (
    <CustomerRouteState
      action={
        resource.status === "error"
          ? {
              label: format({ defaultMessage: "Try again", id: "mobileResourceRetry" }),
              onPress: resource.retry,
            }
          : undefined
      }
      body={
        resource.status === "disabled"
          ? format({
              defaultMessage:
                "Your account details aren't available right now. Please try again later or contact support.",
              id: "mobileResourceDisabledBody",
            })
          : resource.status === "error" && resource.error instanceof ApiError && resource.error.message
            ? resource.error.message
            : format({
                defaultMessage: "GoGoCash could not load your {label}.",
                id: "mobileResourceErrorBody",
              })
      }
      embedded={embedded}
      title={
        resource.status === "disabled"
          ? format({ defaultMessage: "Account data unavailable", id: "mobileResourceDisabledTitle" })
          : format({ defaultMessage: "We could not load {label}", id: "mobileResourceErrorTitle" })
      }
      variant="error"
    />
  );
}
