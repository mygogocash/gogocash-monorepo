"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoginState, TrackableMerchant, trackMerchantListView } from "@/lib/analytics";

interface MerchantListTrackerProps {
  items?: TrackableMerchant[];
  listId: string;
  listName: string;
  category?: string;
  source?: string;
}

const MerchantListTracker = ({
  items,
  listId,
  listName,
  category,
  source,
}: MerchantListTrackerProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const lastTrackedRef = useRef("");

  useEffect(() => {
    if (!pathname || status === "loading" || !items || items.length === 0) {
      return;
    }

    const search = searchParams?.toString() || "";
    const signature = [
      pathname,
      search,
      listId,
      category,
      items.map((item) => item._id || item.offer_id || item.merchant_id).join(","),
    ].join("|");

    if (lastTrackedRef.current === signature) return;

    lastTrackedRef.current = signature;

    trackMerchantListView({
      items,
      listId,
      listName,
      category,
      source,
      pathname,
      search: search ? `?${search}` : "",
      loginState: status === "authenticated" ? "authenticated" : ("guest" as LoginState),
    });
  }, [category, items, listId, listName, pathname, searchParams, source, status]);

  return null;
};

export default MerchantListTracker;
