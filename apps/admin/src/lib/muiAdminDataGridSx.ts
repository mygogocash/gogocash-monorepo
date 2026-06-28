import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";

/** Shared MUI DataGrid chrome for admin tables (follows app light/dark via MUI theme). */
export function getWithdrawDetailDataGridSx(theme: Theme): SystemStyleObject<Theme> {
  const headerBg = theme.palette.mode === "dark" ? theme.palette.grey[800] : "#F6F6F6";

  return {
    width: "100%",
    minWidth: { xs: 520, sm: 620, md: 700 },
    maxWidth: "100%",
    border: 0,
    color: theme.palette.text.primary,
    "& .MuiSvgIcon-root": { fill: "#00B14F" },
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: headerBg,
    },
    "& .MuiDataGrid-filler": {
      backgroundColor: `${headerBg} !important`,
    },
    "& .MuiDataGrid-columnHeaders": {
      borderBottomColor: theme.palette.divider,
    },
    "& .MuiDataGrid-cell": {
      minHeight: "52px !important",
      maxHeight: "none !important",
      overflow: "visible",
      whiteSpace: "normal",
      wordBreak: "break-word",
      borderColor: theme.palette.divider,
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      whiteSpace: "normal",
      lineHeight: 1.2,
    },
    "& .MuiDataGrid-row": {
      borderColor: theme.palette.divider,
    },
    "& .MuiDataGrid-footerContainer": {
      borderTopColor: theme.palette.divider,
    },
    "& .MuiDataGrid-virtualScroller": {
      WebkitOverflowScrolling: "touch",
    },
  };
}
