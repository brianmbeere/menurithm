import { AppBar, Toolbar, Tooltip, Button, IconButton, Box, Typography } from "@mui/material";
import { MenuIcon, AvatarIcon } from "./SVGIcons";
import { useTheme } from "@mui/material/styles";

interface DashboardAppBarProps {
  isMobile: boolean;
  onMenuClick: () => void;
  onAccount: () => void;
}

const DashboardAppBar = ({ isMobile, onMenuClick, onAccount }: DashboardAppBarProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: { md: "100%"}, // 250px is the drawer width, adjust if needed
        ml: { md: "5px" }, // gap between drawer and app bar
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
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={onMenuClick} >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: "GrayText", fontFamily: theme.typography.fontFamily, fontWeight: 600 }}>
            /dashboard
          </Typography>
          <Tooltip title="Account Settings" >
            <Button
              onClick={onAccount}
              startIcon={<AvatarIcon />}
              variant="contained"
              sx={{
                backgroundColor:  '#FFA552',
                color: theme.palette.primary.contrastText,
                fontWeight: 600,
                fontFamily: theme.typography.fontFamily,
                minWidth: 0,
                '&:hover': { backgroundColor: '#FFF3E6', borderColor: '#FFA552', color: '#2F2F2F'}
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
