import React from "react";
import { Button as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material";

interface ButtonProps extends MuiButtonProps {
  children: React.ReactNode;
  uiVariant?: "primary" | "secondary" | "soft" | "ghost" | "dark";
  uiSize?: "sm" | "md" | "lg";
  bgColor?: string;
  height?: string;
  fontSize?: string;
  fontColor?: string;
  fontWeight?: number;
  minWidth?: string;
  border?: string;
  radius?: string;
}

const variantStyles = {
  primary: {
    background: "linear-gradient(135deg, #00B14F 0%, #00883D 100%)",
    color: "#FFFFFF",
    border: "none",
  },
  secondary: {
    background: "#FFFFFF",
    color: "#103522",
    border: "1px solid #C8D5CB",
  },
  soft: {
    background: "#E7F8EE",
    color: "#103522",
    border: "1px solid rgba(0, 177, 79, 0.16)",
  },
  ghost: {
    background: "transparent",
    color: "#103522",
    border: "1px solid transparent",
  },
  dark: {
    background: "#103522",
    color: "#FFFFFF",
    border: "none",
  },
} as const;

const sizeStyles = {
  sm: {
    minHeight: "44px",
    px: 2,
    fontSize: "13px",
  },
  md: {
    minHeight: "46px",
    px: 3,
    fontSize: "14px",
  },
  lg: {
    minHeight: "52px",
    px: 3.5,
    fontSize: "15px",
  },
} as const;

const Button: React.FC<ButtonProps> = ({
  children,
  uiVariant = "primary",
  uiSize = "md",
  bgColor,
  height,
  fontSize,
  fontColor,
  fontWeight,
  minWidth,
  border,
  radius,
  sx,
  ...muiProps
}) => {
  const selectedVariant = variantStyles[uiVariant];
  const selectedSize = sizeStyles[uiSize];

  return (
    <MuiButton
      sx={{
        ...selectedVariant,
        ...selectedSize,
        background: bgColor ? bgColor : selectedVariant.background,
        border: border ? border : selectedVariant.border,
        borderRadius: radius ? radius : "999px",
        px: minWidth === "auto" ? selectedSize.px : selectedSize.px,
        py: 1,
        minHeight: height ? height : selectedSize.minHeight,
        height: height || "auto",
        fontWeight: fontWeight ? fontWeight : 700,
        textTransform: "none",
        color: fontColor ? fontColor : selectedVariant.color,
        fontSize: fontSize ? fontSize : selectedSize.fontSize,
        minWidth: minWidth ? minWidth : "auto",
        boxShadow: "none",
        "&:hover": {
          boxShadow: "none",
          filter: muiProps.disabled ? "none" : "brightness(0.98)",
        },
        ...sx,
      }}
      {...muiProps}
    >
      {children}
    </MuiButton>
  );
};

export default Button;
