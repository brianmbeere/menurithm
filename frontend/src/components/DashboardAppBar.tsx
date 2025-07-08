import { AppBar, Toolbar, Typography, Tooltip, Button, IconButton, Box } from "@mui/material";
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
        width: { md: "calc(100% - 250px)" }, // 250px is the drawer width, adjust if needed
        ml: { md: "10px" }, // gap between drawer and app bar
        mt: { md: 0 },
        flexGrow: 1,
        transition: "width 0.2s, margin-left 0.2s",
      }}
    >
      <AppBar
        position="static"
        variant="outlined"
        elevation={2}
      >
        <Toolbar>
          {isMobile && (
            <IconButton edge="start"  onClick={onMenuClick}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontFamily: theme.typography.fontFamily, color: theme.palette.text.primary }}>
            Menurithm
          </Typography>
          <Tooltip title="Account Settings">
            <Button
              onClick={onAccount}
              startIcon={<AvatarIcon />}
              variant="contained"
              sx={{
              backgroundColor:  '#FFA552',
              color: theme.palette.primary.contrastText,
              fontWeight: 600,
              fontFamily: 'Inter, Poppins, sans-serif',
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
