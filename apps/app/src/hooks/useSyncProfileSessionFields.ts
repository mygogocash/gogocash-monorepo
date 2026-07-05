import { useEffect } from "react";

import { isUserProfileResponse } from "@mobile/api/profileTypes";
import { syncProfileSessionFields } from "@mobile/auth/syncProfileSessionFields";

export function useSyncProfileSessionFields(profile: unknown): void {
  useEffect(() => {
    if (!isUserProfileResponse(profile)) {
      return;
    }

    void syncProfileSessionFields(profile);
  }, [profile]);
}
