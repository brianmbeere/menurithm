import { Alert, Avatar, Box, Button, Card, CardContent, Chip, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { auth } from "../hooks/initializeFirebase";
import { marketplacePath, produceOrdersPath } from "../pages/purchasingRoutes";
import { PageHeading, WorkspaceIcon } from "./WorkspaceUI";
import RestaurantProfileEditor from "./RestaurantProfileEditor";
import { useSquareReturn } from "../hooks/useSquareReturn";

const shortcuts = [
  { path: marketplacePath, title: "Shop farm produce", detail: "Browse available produce from Croprithm farms.", icon: "shop" },
  { path: produceOrdersPath, title: "Orders & quotes", detail: "Track pickup orders and review custom quotes.", icon: "sales" },
] as const;

export default function AccountSettings() {
  const user = auth.currentUser;
  const square = useSquareReturn();
  return <>
    <PageHeading icon="account" title="Account settings" description="Manage your restaurant profile and delivery address." />
    {square && <Alert severity={square.severity} sx={{ mb: 2, maxWidth: 960 }}
      action={<Button component={Link} to="/dashboard/sales#square-sales" color="inherit">Go to sales</Button>}>{square.message}</Alert>}
    <Box sx={{ display: "grid", gap: 2, alignItems: "start", maxWidth: 960,
      gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } }}>
      <RestaurantProfileEditor />
      <Card variant="outlined" component="section" aria-labelledby="account-sign-in">
        <CardContent>
          <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Avatar aria-hidden="true" sx={{ bgcolor: "background.default", color: "primary.dark" }}><WorkspaceIcon name="account" /></Avatar>
            <Box>
              <Typography id="account-sign-in" component="h2" variant="h6">Sign-in details</Typography>
              <Typography variant="body2" color="text.secondary">Account details are read-only here.</Typography>
            </Box>
          </Stack>
          {user ? <Stack component="dl" spacing={1.5} sx={{ m: 0, overflowWrap: "anywhere" }}>
            <Box>
              <Typography component="dt" variant="body2" color="text.secondary">Sign-in email</Typography>
              <Typography component="dd" sx={{ m: 0 }}>{user.email || "Not available"}</Typography>
            </Box>
            {user.email && <Box>
              <Typography component="dt" variant="body2" color="text.secondary">Email verification</Typography>
              <Box component="dd" sx={{ m: 0, mt: 0.5 }}>
                <Chip size="small" variant="outlined" label={user.emailVerified ? "Verified" : "Not verified"} />
              </Box>
            </Box>}
          </Stack> : <Alert severity="warning">Sign in to view your account details.</Alert>}
        </CardContent>
      </Card>
      <Card variant="outlined" component="section" aria-labelledby="account-sales-connections">
        <CardContent>
          <Typography id="account-sales-connections" component="h2" variant="h6">Sales connections</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>Check your Square connection or import sales from the Sales page.</Typography>
          <Button component={Link} to="/dashboard/sales#square-sales" sx={{ minHeight: 44 }}>Manage Square POS</Button>
        </CardContent>
      </Card>
      <Card variant="outlined" component="section" aria-labelledby="account-purchasing">
        <CardContent sx={{ pb: 1 }}>
          <Typography id="account-purchasing" component="h2" variant="h6">Purchasing shortcuts</Typography>
        </CardContent>
        <List disablePadding>
          {shortcuts.map(({ path, title, detail, icon }, index) => <Box component="li" key={path}>
            <ListItemButton component={Link} to={path} divider={index < shortcuts.length - 1} sx={{ gap: 1, py: 1.25 }}>
              <ListItemIcon sx={{ minWidth: 30, color: "primary.dark" }}><WorkspaceIcon name={icon} /></ListItemIcon>
              <ListItemText primary={title} secondary={detail} />
              <Box sx={{ display: "flex", color: "text.secondary" }}><WorkspaceIcon name="arrow" /></Box>
            </ListItemButton>
          </Box>)}
        </List>
      </Card>
    </Box>
  </>;
}
