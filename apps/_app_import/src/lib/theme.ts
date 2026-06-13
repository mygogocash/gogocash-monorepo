import { alpha, createTheme } from "@mui/material/styles";
import { designSystemColor, designSystemRadiusPx } from "@/constants/design-system";

/** Inherit `body` font (Figma EN: DM Sans, TH: Anuphan via `globals.css` + next/font variables). */
const fontFamily = "inherit";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: designSystemColor.mint,
      dark: designSystemColor.green2,
      light: designSystemColor.lightGreen1,
      contrastText: designSystemColor.white,
    },
    secondary: {
      main: designSystemColor.green1,
      dark: designSystemColor.textBrand2,
      light: designSystemColor.lightGreen2,
      contrastText: designSystemColor.white,
    },
    background: {
      default: designSystemColor.gray100,
      paper: designSystemColor.white,
    },
    text: {
      primary: designSystemColor.textGray3,
      secondary: designSystemColor.supportGray3,
    },
    divider: designSystemColor.gray200,
    error: {
      main: designSystemColor.error,
    },
    success: {
      main: designSystemColor.success,
    },
  },
  shape: {
    borderRadius: designSystemRadiusPx.md,
  },
  typography: {
    fontFamily,
    h1: {
      fontFamily,
      fontSize: "3rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h2: {
      fontFamily,
      fontSize: "2.5rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h3: {
      fontFamily,
      fontSize: "2rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h4: {
      fontFamily,
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h5: {
      fontFamily,
      fontSize: "1.25rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h6: {
      fontFamily,
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1,
    },
    body1: {
      fontFamily,
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontFamily,
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontFamily,
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 48,
          paddingInline: 20,
          fontSize: "0.95rem",
          fontWeight: 600,
          boxShadow: "none",
        },
        contained: {
          boxShadow: "none",
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${designSystemColor.mint} 0%, ${designSystemColor.green2} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${designSystemColor.green2} 0%, ${designSystemColor.textBrand2} 100%)`,
            boxShadow: "none",
          },
        },
        outlined: {
          borderWidth: 1,
        },
        outlinedPrimary: {
          backgroundColor: alpha(designSystemColor.lightGreen1, 0.65),
          borderColor: designSystemColor.gray200,
          color: designSystemColor.green1,
          "&:hover": {
            backgroundColor: alpha(designSystemColor.lightGreen1, 0.95),
            borderColor: designSystemColor.gray300,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: alpha(designSystemColor.white, 0.92),
          transition: "border-color 160ms ease, box-shadow 160ms ease",
          "& fieldset": {
            borderColor: designSystemColor.gray200,
          },
          "&:hover fieldset": {
            borderColor: designSystemColor.gray300,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha(designSystemColor.mint, 0.12)}`,
          },
          "&.Mui-focused fieldset": {
            borderColor: designSystemColor.mint,
            borderWidth: 1,
          },
          "& input, & textarea": {
            paddingBlock: 13,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${designSystemColor.gray200}`,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
          backgroundImage: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          padding: 8,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: "hidden",
          "&::before": {
            display: "none",
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: 4,
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: designSystemColor.green1,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha(designSystemColor.textGray3, 0.12),
        },
      },
    },
  },
});
