import { Image } from "expo-image";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";

import { getMobileEnv } from "@mobile/config/env";
import { resolveProfileMediaUrl } from "@mobile/lib/resolveProfileMediaUrl";

import profileAvatarImage from "../../assets/profile-avatar.png";

type ProfileAvatarImageProps = {
  accessibilityLabel: string;
  avatarUrl?: string | null;
  size: number;
  style?: StyleProp<ImageStyle>;
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
      style={StyleSheet.flatten([{ height: size, width: size }, style])}
    />
  );
}
