import { useState } from "react";
import {
  Drawer, List, ListItem, ListItemText, ListItemIcon,
  Container, Typography,
  Card, CardContent, Box, Toolbar, CssBaseline, AppBar,
  Divider, ListItemButton, Button, Fade, useMediaQuery, Tooltip,IconButton
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import InventoryManager from "../components/InventoryManager";
import MenuManager from "../components/MenuManager";
import SalesManager from "../components/SalesManager";
import DishManager from "../components/DishManager";
import Home from "../components/Home";
import {
  Inventory2Icon, ReceiptIcon, RestaurantMenuIcon,
  ListAltIcon, MenuIcon, HomeIcon, LogoutIcon
} from "../components/SVGIcons";
import { auth } from "../hooks/initializeFirebase";

const drawerWidth = 240;

const Dashboard = () => {
  const [refreshKey,setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const sections = [
    { label: "Home", icon: <HomeIcon /> },
    { label: "Inventory", icon: <Inventory2Icon /> },
    { label: "Sales", icon: <ReceiptIcon /> },
    { label: "Dishes", icon: <RestaurantMenuIcon /> },
    { label: "Menu Generator", icon: <ListAltIcon /> },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar />
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {sections.map((section, index) => (
          <ListItem key={section.label} disablePadding>
            <ListItemButton
              selected={activeTab === index}
              onClick={() => {
                setActiveTab(index);
                if (isMobile) toggleDrawer();
              }}
              aria-label={`Navigate to ${section.label}`}
            >
              <ListItemIcon>{section.icon}</ListItemIcon>
              <ListItemText primary={section.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Tooltip title="Sign out of Menurithm">
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            color="secondary"
          >
            Logout
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" color="inherit" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Menurithm Dashboard
          </Typography>
          <Tooltip title="Logout">
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Drawers */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            backgroundColor: "#f3f6f9",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          ml: { xs: 0, md: `${drawerWidth}px` },
          overflowX: "auto",
        }}
      >
        <Toolbar />
        <Container maxWidth={false}>
          <Fade in timeout={500}>
            <Box>
              {activeTab === 0 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent><Home key={refreshKey} /></CardContent>
                </Card>
              )}
              {activeTab === 1 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent><InventoryManager key={refreshKey} /></CardContent>
                </Card>
              )}
              {activeTab === 2 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent><SalesManager /></CardContent>
                </Card>
              )}
              {activeTab === 3 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent><DishManager /></CardContent>
                </Card>
              )}
              {activeTab === 4 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <MenuManager refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
                  </CardContent>
                </Card>
              )}
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;