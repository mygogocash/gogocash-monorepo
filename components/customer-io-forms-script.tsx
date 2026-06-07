import Script from "next/script";
import { customerIoFormsConfig } from "@/lib/app-config";

/**
 * Customer.io Connected Forms handler for the footer newsletter form.
 * The site id is public in Customer.io's own snippet; no API secret is exposed.
 */
export function CustomerIoFormsScript() {
  const config = customerIoFormsConfig();
  if (!config.siteId) return null;

  return (
    <Script
      id="cio-forms-handler"
      src={config.scriptUrl}
      strategy="afterInteractive"
      data-site-id={config.siteId}
      data-base-url={config.baseUrl}
    />
  );
}
