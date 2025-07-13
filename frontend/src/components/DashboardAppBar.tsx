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
        width: { md: "100%" },
        ml: { md: "5px" },
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
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isMobile && (
              <IconButton edge="start" onClick={onMenuClick}>
                <MenuIcon />
              </IconButton>
            )}

            {/* Dynamic Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb">
              <MuiLink
                component={RouterLink}
                to="/dashboard"
                underline="hover"
                color="text.primary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <HomeIcon />
                  Home
              </MuiLink>
              <Typography color="text.primary">/</Typography>
              <Typography color="white">{breadcrumb.title}</Typography>
            </Breadcrumbs>
          </Box>

          {/* Account Button */}
          <Tooltip title="Account Settings">
            <Button
              onClick={onAccount}
              startIcon={<AvatarIcon />}
              variant="contained"
              sx={{
                backgroundColor: "#FFA552",
                color: theme.palette.primary.contrastText,
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
