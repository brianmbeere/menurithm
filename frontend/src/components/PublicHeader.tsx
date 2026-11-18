import { Box, Button, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { WorkspaceIcon } from "./WorkspaceUI";

export default function PublicHeader({ action = "Sign in", to = "/signin" }: { action?: string; to?: string }) {
  return <Box component="header" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
    py: 1.5, gap: 1, borderBottom: 1, borderColor: "divider" }}>
    <Button component={Link} to="/" sx={{ gap: 1, color: "primary.dark", minWidth: 0 }}>
      <WorkspaceIcon name="dishes" size={24} /><Typography fontWeight={800}>Menurithm</Typography>
    </Button>
    <Button component={Link} to={to} variant="outlined" sx={{ flexShrink: 0 }}>{action}</Button>
  </Box>;
}
