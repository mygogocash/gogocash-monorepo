export const appIdentity = {
  displayName: "GoGoCash",
  scheme: "gogocash",
  iosBundleIdentifier: "co.gogocash.app",
  androidPackage: "co.gogocash.app",
} as const;

export const deepLinkRoutes = {
  login: "gogocash://login",
  authCallback: "gogocash://auth/callback",
  shopDetail: "gogocash://shop/:id",
  quest: "gogocash://quest",
  profile: "gogocash://profile",
  wallet: "gogocash://wallet",
  withdraw: "gogocash://withdraw",
  gogosense: "gogocash://gogosense",
  gogosenseActivation: "gogocash://gogosense/activate",
} as const;

export const envDefaults = {
  accountDataSource: "fixtures",
  apiUrl: "https://api-staging.gogocash.co",
  appEnv: "staging",
  frontendUrl: "https://app-staging.gogocash.co",
} as const;

export const mobileSessionFields = [
  "_id",
  "email",
  "username",
  "access_token",
  "wallet",
  "region",
  "mobile",
  "birthdate",
  "gender",
  "id_telegram",
  "provider",
  "is_new_user",
  "auth_flow",
  "avatar_url",
] as const;

export type MobileSessionField = (typeof mobileSessionFields)[number];
