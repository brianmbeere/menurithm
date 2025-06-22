import {  useState } from "react";
import {
  Drawer, List, ListItem, ListItemText, ListItemIcon,
  Container, Typography, CircularProgress,
  Card, CardContent, Box, Toolbar, CssBaseline, AppBar, Divider, ListItemButton, Button
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getGeneratedMenu } from "../api/menu";
import InventoryManager from "../components/InventoryManager";
import SalesManager from "../components/SalesManager";
import DishManager from "../components/DishManager";
import useMediaQuery from "@mui/material/useMediaQuery";
import { IconButton } from "@mui/material";
import { Inventory2Icon, ReceiptIcon, RestaurantMenuIcon, ListAltIcon, MenuIcon } from "../components/SVGIcons";

const drawerWidth = 240;

const Home = () => {
  const [menu, setMenu] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const sections = [
    { label: "Inventory", icon: <Inventory2Icon /> },
    { label: "Sales", icon: <ReceiptIcon /> },
    { label: "Dishes", icon: <RestaurantMenuIcon /> },
    { label: "Menu Generator", icon: <ListAltIcon /> }
  ];

  const drawerContent = (
    <>
      <Toolbar />
      <Divider />
      <List>
        {sections.map((section, index) => (
          <ListItem key={section.label} disablePadding>
            <ListItemButton
              selected={activeTab === index}
              onClick={() => {
                setActiveTab(index);
                if (isMobile) toggleDrawer();
              }}
            >
              <ListItemIcon>{section.icon}</ListItemIcon>
              <ListItemText primary={section.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  const handleGenerateMenu = async () => {
    setLoading(true);
    try {
      const data = await getGeneratedMenu();
      setMenu(data.dishes);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar for mobile */}
      <AppBar position="fixed" sx={{ display: { md: "none" } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            Menurithm
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            backgroundColor: "#f3f6f9",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#f3f6f9",
          },
        }}
        open
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
        <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          {/* Sticky Title with Shadow */}
          <Box
            sx={{
              position: "sticky",
              top: { xs: 56, sm: 64 }, // Match AppBar height
              zIndex: 1100,
              backgroundColor: "#ffffff",
              pb: 1,
              pt: 1,
              mb: 2,
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)", // Subtle shadow
            }}
          >
            <Typography variant="h4" fontWeight={700} color="primary">
              Menurithm Dashboard
            </Typography>
          </Box>

          {activeTab === 0 && (
            <Card elevation={3} sx={{ backgroundColor: "#ffffff", mb: 3 }}>
              <CardContent sx={{ overflowX: "auto" }}>
                <InventoryManager key={refreshKey} />
              </CardContent>
            </Card>
          )}

          {activeTab === 1 && (
            <Card elevation={3} sx={{ backgroundColor: "#ffffff", mb: 3 }}>
              <CardContent sx={{ overflowX: "auto" }}>
                <SalesManager />
              </CardContent>
            </Card>
          )}

          {activeTab === 2 && (
            <Card elevation={3} sx={{ backgroundColor: "#ffffff", mb: 3 }}>
              <CardContent sx={{ overflowX: "auto" }}>
                <DishManager />
              </CardContent>
            </Card>
          )}

          {activeTab === 3 && (
            <Card elevation={3} sx={{ backgroundColor: "#ffffff" }}>
              <CardContent sx={{ overflowX: "auto" }}>
                <Typography variant="h6" gutterBottom>
                  Generate Menu Suggestions
                </Typography>
                <Button variant="contained" onClick={handleGenerateMenu} sx={{ mb: 2 }}>
                  Generate Menu
                </Button>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <List dense>
                    {menu.map((item, i) => (
                      <ListItem key={i}>{item}</ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
