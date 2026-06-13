const isNativeRuntime = process.env.EXPO_OS === "ios" || process.env.EXPO_OS === "android";

export const colors = {
  background: "#F6F6F6",
  border: "#E4E4E4",
  borderStrong: "#D8E2D9",
  card: "#FFFFFF",
  ink: "#3B3B3B",
  muted: "#7F7F7F",
  primary: "#00CC99",
  primaryDark: "#00AA80",
  primarySoft: "#D8F8EF",
  accent: "#005D46",
  accentSoft: "#007D5E",
  textSoft: "#989898",
  warningSoft: "#FFF7E6",
  white: "#FFFFFF",
  danger: "#CD0D0D",
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 24,
  chip: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  homeStackGap: 16,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  action: 15,
  actionLineHeight: 20,
  actionWeight: "700",
  body: 15,
  bodyLineHeight: 23,
  bodyWeight: "400",
  caption: 12,
  captionLineHeight: 16,
  captionWeight: "400",
  family: isNativeRuntime ? "DM Sans" : '"DM Sans", Anuphan, system-ui, sans-serif',
  thaiFamily: isNativeRuntime ? "Anuphan" : 'Anuphan, "DM Sans", system-ui, sans-serif',
  headline: 28,
  iconStrokeWidth: 1.75,
  label: 14,
  labelLineHeight: 20,
  labelWeight: "500",
  letterSpacing: 0,
  navLabelWeight: "400",
  pageTitle: 32,
  pageTitleLineHeight: 40,
  pageTitleWeight: "600",
  sectionTitle: 26,
  sectionTitleWeight: "800",
  title: 20,
  titleLineHeight: 28,
  titleWeight: "600",
} as const;

export const shadows = {
  bottomNavCss: "0 -8px 30px rgba(16, 34, 23, 0.14)",
  bottomNav: {
    elevation: 12,
    shadowColor: "#102217",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
  },
  cardCss: "0 4px 16px rgba(0, 0, 0, 0.05)",
  card: {
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
} as const;
