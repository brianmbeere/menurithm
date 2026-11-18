import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

const paths = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  inventory: "M3 8h18v13H3z M2 4h20v4H2z M9 12h6",
  dishes: "M3 17h18 M5 17a7 7 0 0 1 14 0 M12 8V5 M2 21h20",
  sales: "M5 3l2 2 2-2 3 2 3-2 2 2 2-2v18l-2-2-2 2-3-2-3 2-2-2-2 2z M9 9h6 M9 13h6",
  menu: "M5 3h14v18H5z M9 7h6 M9 12h6 M9 17h4",
  shop: "M3 10l2-6h14l2 6 M3 10v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0v-2H3 M5 15v6h14v-6",
  chart: "M3 3v18h18 M8 16v-4 M13 16V8 M18 16V5",
  link: "M10 8l3-3a4 4 0 0 1 6 6l-3 3 M14 16l-3 3a4 4 0 0 1-6-6l3-3 M9 15l6-6",
  account: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  bars: "M4 6h16 M4 12h16 M4 18h16",
  logout: "M10 4H4v16h6 M9 12h12 M17 8l4 4-4 4",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  collapse: "M4 4h16v16H4z M9 4v16 M16 9l-3 3 3 3",
  expand: "M4 4h16v16H4z M9 4v16 M13 9l3 3-3 3",
  add: "M12 5v14 M5 12h14",
  edit: "m4 16 11-11 4 4L8 20H4z M13 7l4 4",
  delete: "M4 6h16 M9 6V3h6v3 M6 6l1 14h10l1-14 M10 10v6 M14 10v6",
  save: "M4 4h14l2 2v14H4z M8 4v6h8V4 M8 20v-6h8v6",
  upload: "M12 16V4 M8 8l4-4 4 4 M4 16v4h16v-4",
  download: "M12 4v12 M8 12l4 4 4-4 M4 16v4h16v-4",
  down: "m6 9 6 6 6-6",
  up: "m6 15 6-6 6 6",
  check: "M8 12l3 3 5-6 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
  error: "M12 7v5 M12 16h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
  warning: "M12 3 2 20h20z M12 9v4 M12 16h.01",
  cart: "M2 4h3l3 11h11l2-8H6 M9 20h.01 M18 20h.01",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M15 15l5 5",
} as const;

export type IconName = keyof typeof paths;

export function WorkspaceIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

export function PageHeading({ title, description, actions, icon }: {
  title: string; description: string; actions?: ReactNode; icon?: IconName;
}) {
  return <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}
    justifyContent="space-between" sx={{ mb: 3 }}>
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
      {icon && <Box sx={{ display: "grid", placeItems: "center", flexShrink: 0, width: 44, height: 44,
        borderRadius: 2, color: "primary.dark", bgcolor: "background.default" }}><WorkspaceIcon name={icon} /></Box>}
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h1" variant="h4" sx={{ fontSize: { xs: "1.65rem", sm: "2rem" }, fontWeight: 750, letterSpacing: "-.03em" }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>
      </Box>
    </Stack>
    {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
  </Stack>;
}
