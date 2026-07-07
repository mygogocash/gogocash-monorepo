import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { uploadProfileAvatar } from "@mobile/account/profileAvatarResource";
import { notifyMobileSessionChange } from "@mobile/auth/session";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { getMobileEnv } from "@mobile/config/env";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { compressProfileAvatarWeb } from "@mobile/lib/compressProfileAvatarWeb";

export function useProfileAvatarUpload(initialAvatarUrl?: string | null) {
  const tc = useCopy();
  const toast = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl?.trim() || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl?.trim() || null);
  }, [initialAvatarUrl]);

  const persistAvatarUrl = useCallback(async (nextAvatarUrl: string) => {
    const sessionStore = await getSharedSessionStore();
    if (!sessionStore) {
      return;
    }

    const session = (await sessionStore.getSession()) ?? {};
    await sessionStore.setSession({
      ...session,
      avatar_url: nextAvatarUrl,
    });
    notifyMobileSessionChange();
  }, []);

  const uploadFromFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.show(tc("Please choose an image file."));
        return;
      }

      setUploading(true);
      try {
        const compressed = await compressProfileAvatarWeb(file);
        const nextAvatarUrl = await uploadProfileAvatar(
          getMobileEnv().apiUrl,
          compressed,
          file.name.replace(/\.\w+$/, ".jpg") || "avatar.jpg",
        );
        setAvatarUrl(nextAvatarUrl);
        await persistAvatarUrl(nextAvatarUrl);
        toast.show(tc("Profile photo updated"));
      } catch (error) {
        toast.show(tc("Could not upload photo. Please try again."));
      } finally {
        setUploading(false);
      }
    },
    [persistAvatarUrl, tc, toast],
  );

  const pickAndUpload = useCallback(async () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      toast.show(tc("Profile photo upload is available on web for now."));
      return;
    }

    await new Promise<void>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        void (async () => {
          if (file) {
            await uploadFromFile(file);
          }
          resolve();
        })();
      };
      input.click();
    });
  }, [tc, toast, uploadFromFile]);

  return {
    avatarUrl,
    pickAndUpload,
    setAvatarUrl,
    uploading,
  };
}
