import { useState } from "react";
import {
  Container,
  Box,
  Toolbar,
  CssBaseline,
  Card,
  CardContent,
  Fade,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import InventoryManager from "../components/InventoryManager";
import MenuManager from "../components/MenuManager";
import DishManager from "../components/DishManager";
import SalesManager from "../components/SalesManager";
import Dashboard from "../components/Dashboard";
import AIAnalyticsDashboard from "../components/AIAnalyticsDashboard";
import ServiceIntegrationPanel from "../components/ServiceIntegrationPanel";
import DashboardNavigation from "../components/DashboardNavigation";
import DashboardAppBar from "../components/DashboardAppBar";

// Drawer sizes
const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const tabRoutes = [
  { title: "Dashboard", path: "/dashboard" },
  { title: "AI Analytics", path: "/dashboard/ai-analytics" },
  { title: "Inventory", path: "/dashboard/inventory" },
  { title: "Sales", path: "/dashboard/sales" },
  { title: "Dishes", path: "/dashboard/dishes" },
  { title: "Menu Generator", path: "/dashboard/menu" },
  { title: "Service Integration", path: "/dashboard/service-integration" },
];

const PageFrame = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const handleAccountSettings = () => navigate("/account");
  const handleLogout = () => navigate("/");
  const handleLogoClick = () => navigate("/dashboard");

  return (
    <Box sx={{ display: "flex", backgroundColor: theme.palette.background.default }}>
      <CssBaseline />

      {/* AppBar: Responsive width based on drawer state */}
      <Box
        sx={{
          position: "fixed",
          top: 5,
          pr: 2,
          left: {
            xs: 0,
            md: `${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px`,
          },
          width: {
            xs: "100%",
            md: `calc(100% - ${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px)`,
          },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <DashboardAppBar
          isMobile={isMobile}
          onMenuClick={toggleDrawer}
          onAccount={handleAccountSettings}
          breadcrumb={tabRoutes[activeTab]}
        />
      </Box>

      {/* Sidebar Navigation Drawer */}
      <DashboardNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        drawerWidth={drawerExpanded ? drawerWidth : collapsedDrawerWidth}
        onLogout={handleLogout}
        setExpanded={setDrawerExpanded}
        onLogoClick={handleLogoClick}
        expanded={drawerExpanded}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          backgroundColor: theme.palette.background.default,
          minHeight: "100vh",
          pt: "64px", // AppBar height
          ml: {
            md: `${drawerExpanded ? drawerWidth : collapsedDrawerWidth}px`,
          },
          transition: "margin-left 0.2s ease-in-out",
        }}
      >
        {/* Push content down to avoid overlap with AppBar */}
        <Toolbar sx={{ minHeight: 64 }} />

        <Container maxWidth={false} sx={{ py: 2 }}>
          <Fade in timeout={500}>
            <Box>
              {activeTab === 0 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <Dashboard  />
                  </CardContent>
                </Card>
              )}
              {activeTab === 1 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <AIAnalyticsDashboard />
                  </CardContent>
                </Card>
              )}
              {activeTab === 2 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <InventoryManager />
                  </CardContent>
                </Card>
              )}
                 {activeTab === 3 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <DishManager />
                  </CardContent>
                </Card>
              )}
              {activeTab === 4 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <SalesManager />
                  </CardContent>
                </Card>
              )}
              {activeTab === 5 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <MenuManager />
                  </CardContent>
                </Card>
              )}
              {activeTab === 6 && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardContent>
                    <ServiceIntegrationPanel />
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

export default PageFrame;
