import {
  AppBar,
  Toolbar,
  Tooltip,
  Button,
  IconButton,
  Box,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { MenuIcon, AvatarIcon } from "./SVGIcons";
import { useTheme } from "@mui/material/styles";
import { HomeIcon } from "./SVGIcons";

interface DashboardAppBarProps {
  isMobile: boolean;
  onMenuClick: () => void;
  onAccount: () => void;
  breadcrumb: { title: string; path: string }; // New prop for dynamic breadcrumb
}

const DashboardAppBar = ({
  isMobile,
  onMenuClick,
  onAccount,
  breadcrumb,
}: DashboardAppBarProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        mt: { md: 0 },
        transition: "width 0.2s, margin-left 0.2s",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <AppBar
        position="static"
        variant="outlined"
        sx={{
          boxShadow: theme.shadows[1],
        }}
        elevation={2}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1, minHeight: "64px !important" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {isMobile && (
              <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation">
                <MenuIcon />
              </IconButton>
            )}

            {/* Dynamic Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ '& ol': { flexWrap: 'nowrap' }, minWidth: 0 }}>
              <MuiLink
                component={RouterLink}
                to="/dashboard"
                underline="hover"
                color="text.primary"
                sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}
              >
                <HomeIcon />
                  Home
              </MuiLink>
              <Typography color="text.primary" noWrap sx={{ maxWidth: { xs: 145, sm: 300 }, fontWeight: 600 }}>{breadcrumb.title}</Typography>
            </Breadcrumbs>
          </Box>

          {/* Account Button */}
          <Tooltip title="Account Settings">
            <Button
              onClick={onAccount}
              startIcon={<AvatarIcon />}
              variant="contained"
              sx={{
                backgroundColor: "transparent",
                color: theme.palette.text.primary,
                fontWeight: 600,
                fontFamily: theme.typography.fontFamily,
                minWidth: 0,
                "&:hover": {
                  backgroundColor: "#FFF3E6",
                  borderColor: "#FFA552",
                  color: "#2F2F2F",
                },
              }}
            >
              Account
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default DashboardAppBar;
