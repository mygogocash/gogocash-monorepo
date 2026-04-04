/** Max upload size before compression (10 MB). */
export const MAX_PROFILE_AVATAR_BYTES = 10 * 1024 * 1024;

export function assertProfileAvatarFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_PROFILE_AVATAR_BYTES) {
    throw new Error("Image must be 10 MB or smaller.");
  }
}

/**
 * Downscale and JPEG-compress for localStorage / JWT-friendly payloads.
 */
export function compressProfileAvatarToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 512;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        reject(new Error("Could not encode image."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

export function profileAvatarStorageKey(userId: string): string {
  return `gogocash_profile_avatar_${userId}`;
}
