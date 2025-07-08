import { useState } from "react";
import {
  Container, Box, Toolbar, CssBaseline, 
  Card, CardContent, Fade, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import InventoryManager from "../components/InventoryManager";
import MenuManager from "../components/MenuManager";
import SalesManager from "../components/SalesManager";
import DishManager from "../components/DishManager";
import Dashboard from "../components/Dashboard";
import DashboardNavigation from "../components/DashboardNavigation";
import DashboardAppBar from "../components/DashboardAppBar";

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const PageFrame = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const handleAccountSettings = () => {
    // Navigate to account settings page
    navigate("/account");
  };

  return (
    <Box sx={{ display: "flex", fontFamily: theme.typography.fontFamily, backgroundColor: theme.palette.background.default }}>
      <CssBaseline />

      {/* Drawer */}
      <DashboardNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        drawerWidth={drawerExpanded ? drawerWidth : collapsedDrawerWidth}
        onLogout={handleAccountSettings}
        // @ts-ignore
        setExpanded={setDrawerExpanded}
        expanded={drawerExpanded}
      />

      {/* AppBar and Main Content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ width: { md: `calc(100% - ${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px)` },
          display: "flex", alignItems: "center", height: 64, mt: { xs: 0, md: 2 },
          ml: { md: `${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px` },
        }}>
          <DashboardAppBar
            isMobile={isMobile}
            onMenuClick={toggleDrawer}
            onAccount={handleAccountSettings}
          />
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            ml: 0,
            transition: "margin-left 0.2s",
            marginLeft: { md: `${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px` },
            overflowX: "auto",
            backgroundColor: theme.palette.background.default,
            minHeight: "calc(100vh - 64px)",
            fontFamily: theme.typography.fontFamily,
          }}
        >
          <Toolbar sx={{ minHeight: 0, height: 0, p: 0, m: 0 }} />
          <Container maxWidth={false}>
            <Fade in timeout={500}>
              <Box>
                {activeTab === 0 && (
                  <Card elevation={3} sx={{ mb: 3 }}>
                    <CardContent><Dashboard key={refreshKey} /></CardContent>
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
    </Box>
  );
};

export default PageFrame;