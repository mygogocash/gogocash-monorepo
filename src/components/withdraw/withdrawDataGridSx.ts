import type { SxProps, Theme } from "@mui/material/styles";

export const withdrawDetailDataGridSx: SxProps<Theme> = {
  width: "100%",
  minWidth: "700px",
  border: 0,
  "& .MuiSvgIcon-root": { fill: "#00B14F" },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "#F6F6F6",
  },
  "& .MuiDataGrid-filler": {
    backgroundColor: "#F6F6F6 !important",
  },
  "& .MuiDataGrid-cell": {
    minHeight: "52px !important",
    maxHeight: "none !important",
    overflow: "visible",
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    whiteSpace: "normal",
    lineHeight: 1.2,
  },
};
