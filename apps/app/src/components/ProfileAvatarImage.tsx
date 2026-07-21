import { Image } from "expo-image";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";

import { getMobileEnv } from "@mobile/config/env";
import { resolveProfileMediaUrl } from "@mobile/lib/resolveProfileMediaUrl";
import { radii } from "@mobile/theme/tokens";

import profileAvatarImage from "../../assets/profile-avatar.png";

/**
 * Every radius key on ImageStyle: the `borderRadius` shorthand plus the four per-corner keys.
 * (ImageStyle carries no logical start/end radius props — ViewStyle does, ImageStyle does not.)
 * Matched by shape rather than listed, so radius props added by future React Native versions
 * are covered automatically.
 */
type ImageRadiusKey = Extract<keyof ImageStyle, `border${string}Radius`>;

/**
 * The circular crop, applied over whatever a caller passed. Every radius key is listed, not
 * just the `borderRadius` shorthand: a per-corner radius beats the shorthand at runtime, so
 * `borderTopLeftRadius: 0` alone would square a corner. The `Record<ImageRadiusKey, …>`
 * annotation is load-bearing — it fails the build if a key is missing, including new radius
 * props added by future React Native versions.
 *
 * radii.chip (999) rather than size / 2: ProfileHeroCard, CustomerProfileBar and
 * CustomerProfileMenu override height/width to "100%", decoupling `size` from the rendered
 * box. 999 clamps to a circle at any dimension; size / 2 would render a lozenge.
 */
const CIRCULAR_CROP: Record<ImageRadiusKey, number> = {
  borderRadius: radii.chip,
  borderBottomLeftRadius: radii.chip,
  borderBottomRightRadius: radii.chip,
  borderTopLeftRadius: radii.chip,
  borderTopRightRadius: radii.chip,
};

type ProfileAvatarImageProps = {
  accessibilityLabel: string;
  avatarUrl?: string | null;
  size: number;
  /** Radius keys are omitted: ProfileAvatarImage owns the circular crop (see `style` below). */
  style?: StyleProp<Omit<ImageStyle, ImageRadiusKey>>;
};

export function ProfileAvatarImage({
  accessibilityLabel,
  avatarUrl,
  size,
  style,
}: ProfileAvatarImageProps) {
  const resolvedUri = resolveProfileMediaUrl(avatarUrl, getMobileEnv().apiUrl);

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      allowDownscaling={false}
      cachePolicy="memory-disk"
      contentFit="cover"
      recyclingKey={resolvedUri ?? "profile-avatar-default"}
      source={resolvedUri ? { uri: resolvedUri } : profileAvatarImage}
      // Profile photos are always cropped to a circle, for every member. CIRCULAR_CROP merges
      // AFTER `style` so no call site can reintroduce a square avatar — the clip used to come
      // only from <GoGoPassAvatar>'s premium branch, so non-premium members (and, with
      // isGoGoPassEnabled() off, everyone) saw a square. The prop type omits radius keys, but
      // StyleSheet.create() styles bypass excess-property checking, so the runtime merge —
      // not the type — is what actually holds the invariant.
      style={StyleSheet.flatten([{ height: size, width: size }, style, CIRCULAR_CROP])}
    />
  );
}
