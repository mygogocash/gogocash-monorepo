"use client";

import React from "react";
import { TextField, TextFieldProps } from "@mui/material";

interface InputProps extends Omit<TextFieldProps, "variant"> {
  variant?: "outlined" | "filled" | "standard";
  uiVariant?: "default" | "search" | "soft";
}

const variantStyles = {
  default: {
    " .MuiInputBase-root": {
      borderRadius: "18px",
    },
  },
  search: {
    " .MuiOutlinedInput-root": {
      borderRadius: "999px",
      backgroundColor: "#f3faf7",
      boxShadow: "none",
      minHeight: 48,
      transition: "background-color 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        backgroundColor: "#ffffff",
      },
      "&.Mui-focused": {
        backgroundColor: "#ffffff",
        boxShadow: "0 0 0 3px rgba(0, 204, 153, 0.18)",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(0, 170, 128, 0.16)",
        borderWidth: 1,
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(0, 170, 128, 0.38)",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#00CC99",
        borderWidth: 1,
      },
    },
    " .MuiInputBase-input": {
      paddingTop: "12px",
      paddingBottom: "12px",
      fontSize: "15px",
      lineHeight: 1.45,
      color: "#374151",
    },
    " .MuiInputBase-input::placeholder": {
      color: "#9ca3af",
      opacity: 1,
    },
  },
  soft: {
    " .MuiInputBase-root": {
      borderRadius: "18px",
      backgroundColor: "#F8FBF5",
    },
  },
} as const;

const Input = React.forwardRef<HTMLDivElement, InputProps>(function Input(
  { variant = "outlined", fullWidth = true, uiVariant = "default", sx, ...props },
  ref
) {
  return (
    <TextField
      ref={ref}
      variant={variant}
      fullWidth={fullWidth}
      {...props}
      sx={{ ...variantStyles[uiVariant], ...sx }}
    />
  );
});

export default Input;
