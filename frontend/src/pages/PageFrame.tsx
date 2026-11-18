import { useState, type ComponentType } from "react";
import { Alert, Box, Button, Container, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { WorkspaceIcon, type IconName } from "../components/WorkspaceUI";
import NotFound from "./NotFound";
import Dashboard from "../components/Dashboard";
import InventoryManager from "../components/InventoryManager";
import DishManager from "../components/DishManager";
import SalesManager from "../components/SalesManager";
import MenuManager from "../components/MenuManager";
import ProduceMarketplace from "../components/ProduceMarketplace";
import AIAnalyticsDashboard from "../components/AIAnalyticsDashboard";
import ServiceIntegrationPanel from "../components/ServiceIntegrationPanel";
import AccountSettings from "../components/AccountSettings";

const groups: { label: string; pages: { path: string; title: string; icon: IconName; Component: ComponentType }[] }[] = [
  { label: "Kitchen", pages: [
    { path: "/dashboard", title: "Overview", icon: "overview", Component: Dashboard },
    { path: "/dashboard/inventory", title: "Inventory", icon: "inventory", Component: InventoryManager },
    { path: "/dashboard/dishes", title: "Dishes & recipes", icon: "dishes", Component: DishManager },
    { path: "/dashboard/sales", title: "Sales", icon: "sales", Component: SalesManager },
    { path: "/dashboard/menu", title: "Menu planning", icon: "menu", Component: MenuManager },
  ] },
  { label: "Purchasing", pages: [
    { path: "/dashboard/produce-orders", title: "Produce marketplace", icon: "shop", Component: ProduceMarketplace },
  ] },
  { label: "Manage", pages: [
    { path: "/dashboard/ai-analytics", title: "Analytics", icon: "chart", Component: AIAnalyticsDashboard },
    { path: "/dashboard/service-integration", title: "Integrations", icon: "link", Component: ServiceIntegrationPanel },
    { path: "/account", title: "Account settings", icon: "account", Component: AccountSettings },
  ] },
];

export default function PageFrame() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ActivePage = groups.flatMap(group => group.pages)
    .find(page => page.path === pathname.replace(/\/+$/, ""))?.Component;
  const collapsed = compact && !mobile;
  const width = collapsed ? 68 : 248;
  const logout = async () => {
    try {
      await signOut(getAuth());
      navigate("/signin", { replace: true });
    } catch (error) {
      console.error("Could not sign out", error);
      setLogoutError(true);
      setMobileOpen(false);
    }
  };

  return <Box sx={{ display: "flex", minHeight: "100dvh" }}>
    <Drawer variant={mobile ? "temporary" : "permanent"} open={mobile ? mobileOpen : true}
      onClose={() => setMobileOpen(false)} sx={{ flexShrink: 0, width: mobile ? 0 : width }}
      slotProps={{ paper: { sx: { width, borderRadius: 0, bgcolor: "background.paper", color: "text.primary" } } }}>
      <Stack sx={{ minHeight: "100%", p: 1.25 }}>
        <Button component={Link} to="/dashboard" aria-label="Menurithm overview" onClick={() => setMobileOpen(false)}
          sx={{ minHeight: 52, justifyContent: collapsed ? "center" : "flex-start", gap: 1, color: "primary.dark" }}>
          <WorkspaceIcon name="dishes" size={24} />{!collapsed && <Typography fontWeight={800}>Menurithm</Typography>}
        </Button>
        <Box component="nav" aria-label="Workspace navigation" sx={{ flex: 1, mt: 1 }}>
          {groups.map(group => <Box key={group.label} sx={{ mb: 1.5 }}>
            {!collapsed ? <Typography variant="caption" sx={{ display: "block", px: 1.5, py: 0.75, fontWeight: 700, color: "text.secondary" }}>{group.label}</Typography> : <Divider sx={{ my: 1 }} />}
            <List disablePadding>
              {group.pages.map(page => <Tooltip key={page.path} title={collapsed ? page.title : ""} placement="right">
                <ListItemButton component={NavLink} to={page.path} end aria-label={page.title}
                  onClick={() => setMobileOpen(false)} sx={{ px: collapsed ? 0 : 1.5, py: 1, minHeight: 44,
                    justifyContent: collapsed ? "center" : "flex-start", borderRadius: 2,
                    "&.active": { bgcolor: "action.selected", color: "primary.dark" } }}>
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: "inherit" }}><WorkspaceIcon name={page.icon} /></ListItemIcon>
                  {!collapsed && <ListItemText primary={page.title} slotProps={{ primary: { variant: "body2", fontWeight: 650 } }} />}
                </ListItemButton>
              </Tooltip>)}
            </List>
          </Box>)}
        </Box>
        <Divider sx={{ my: 1 }} />
        <Tooltip title={collapsed ? "Sign out" : ""} placement="right">
          <Button aria-label="Sign out" onClick={() => void logout()} sx={{ gap: 1, color: "text.secondary", minHeight: 44 }}>
            <WorkspaceIcon name="logout" />{!collapsed && "Sign out"}
          </Button>
        </Tooltip>
      </Stack>
    </Drawer>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack component="header" direction="row" alignItems="center" justifyContent="space-between"
        sx={{ position: "sticky", top: 0, zIndex: theme.zIndex.appBar, px: { xs: 2, md: 3 }, minHeight: 58,
          bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton aria-label={mobile ? "Open navigation" : collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => mobile ? setMobileOpen(true) : setCompact(!compact)}>
            <WorkspaceIcon name={mobile ? "bars" : collapsed ? "expand" : "collapse"} />
          </IconButton>
          <Typography variant="body2" fontWeight={750}>Kitchen workspace</Typography>
        </Stack>
        <Button component={Link} to="/account" startIcon={<WorkspaceIcon name="account" />} color="secondary">Account</Button>
      </Stack>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        {logoutError && <Alert severity="error" onClose={() => setLogoutError(false)} sx={{ mb: 2 }}>Could not sign out. Please try again.</Alert>}
        {ActivePage ? <ActivePage /> : <NotFound workspace />}
      </Container>
    </Box>
  </Box>;
}
