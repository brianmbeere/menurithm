import {
  Drawer, List, ListItem, ListItemText, ListItemIcon,
  Divider, ListItemButton, Button, Toolbar, Box, Tooltip, Typography, IconButton
} from "@mui/material";
import {
  ReceiptIcon,
  ListAltIcon, HomeIcon, LogoutIcon,DishesIcon, DrawerExpandIcon, DrawerCollapseIcon,
} from "./SVGIcons";
import { useTheme } from "@mui/material/styles";
import logo from '../assets/menurithm-logo-white.png';

interface DashboardNavigationProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  drawerWidth: number;
  onLogout: () => void;
  onLogoClick: () => void;
  setExpanded: (expanded: boolean) => void;
  expanded: boolean;
}

const sections = [
  { label: "Dashboard", icon: <HomeIcon /> },
  { label: "Inventory", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  },
  { label: "Sales", icon: <ReceiptIcon /> },
  { label: "Dishes", icon: <DishesIcon /> },
  { label: "Menu Generator", icon: <ListAltIcon /> },
];

const COLLAPSED_WIDTH = 64;

const DashboardNavigation = ({
  activeTab,
  setActiveTab,
  isMobile,
  mobileOpen,
  setMobileOpen,
  drawerWidth,
  onLogout,
  onLogoClick,
  setExpanded,
  expanded,
}: DashboardNavigationProps) => {
  const toggleDrawer = () => setMobileOpen(!mobileOpen);
  const theme = useTheme();
  
  const currentDrawerWidth = expanded ? drawerWidth : COLLAPSED_WIDTH;

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: 'Inter, Poppins, sans-serif' }}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: expanded ? "flex-end" : "center",
          alignItems: "center",
          minHeight: 56,
          px: 1,
        }}
      >
         <IconButton edge="start" onClick={onLogoClick}>
            <img 
              src={logo} 
              alt="Menurithm Logo" 
              style={{
                height: 30,
                objectFit: "contain",
              }}
            />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="dashboard"
            sx={{
              mr: 1,
              display: { xs: 'flex', md: 'flex' },
              fontFamily: theme.typography.fontFamily,
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            Menurithm
          </Typography>      
        {/* 
        <IconButton onClick={handleExpandToggle} size="small" aria-label={expanded ? "Collapse drawer" : "Expand drawer"}>
          {expanded ? <DrawerCollapseIcon /> : <DrawerExpandIcon />}
        </IconButton> 
        */}
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {sections.map((section, index) => (
          <ListItem key={section.label} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              selected={activeTab === index}
              onClick={() => {
                setActiveTab(index);
                if (isMobile) toggleDrawer();
              }}
              aria-label={`Navigate to ${section.label}`}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                minHeight: 48,
                justifyContent: expanded ? "initial" : "center",
                px: 2.5,
                '&.Mui-selected': {
                  backgroundColor: '#2ECC71',
                  color: '#FAFAFA',
                  '& .MuiListItemIcon-root': { color: '#FAFAFA' },
                },
                '&:hover': {
                  backgroundColor: '#B2F2BB',
                  color: '#2F2F2F',
                },
                fontWeight: 600,
                fontFamily: 'Inter, Poppins, sans-serif',
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: expanded ? 2 : "auto",
                  justifyContent: "center",
                  color: activeTab === index ? '#FAFAFA' : '#2F2F2F',
                }}
              >
                {section.icon}
              </ListItemIcon>
              {expanded && <ListItemText primary={section.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: expanded ? 2: 1, pb: expanded ? 2 : 1, display:"flex", flexDirection:expanded? "row":"column" }} >
        <Tooltip title="Sign out of Menurithm" placement={expanded ? "top" : "right"} >
          <Button
            variant="contained"
            fullWidth={expanded}
            startIcon={expanded ? <LogoutIcon /> : undefined}
            onClick={onLogout}
            sx={{
              backgroundColor:  '#FFA552',
              color: theme.palette.primary.contrastText,
              fontWeight: 600,
              fontFamily: 'Inter, Poppins, sans-serif',
              minWidth: 0,
              px: expanded ? 2 : 1,
              justifyContent: expanded ? "flex-start" : "center",
              '&:hover': { backgroundColor: '#FFF3E6', borderColor: '#FFA552', color: '#2F2F2F'}
            }}
          >
            {expanded ? "Logout" : <LogoutIcon />}
          </Button>
        </Tooltip>
        <Tooltip title="Expand or Collapse" sx={{ p: expanded ? 2: 1, pb: expanded ? 2 : 1}}>
          <IconButton 
            sx={{
              minWidth: 0,
              px: expanded ? 2 : 1,
            }}
          >
            { expanded ?   <DrawerCollapseIcon onClick={() => { setExpanded(false); }}/> :  <DrawerExpandIcon onClick={() => { setExpanded(true); }}/> }
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? mobileOpen : true}
      onClose={toggleDrawer}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: "block", md: "block" },
        "& .MuiDrawer-paper": {
          boxSizing: "border-box",
          width: currentDrawerWidth,
          transition: "width 0.2s",
          backgroundColor: "#B2F2BB",
          color: "#2F2F2F",
          fontFamily: 'Inter, Poppins, sans-serif',
          borderRight: "none",
          overflowX: "hidden",
          borderRadius: 0, 
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default DashboardNavigation;


