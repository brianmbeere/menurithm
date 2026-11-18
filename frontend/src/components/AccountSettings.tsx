import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { auth } from "../hooks/initializeFirebase";
import { PageHeading } from "./WorkspaceUI";

export default function AccountSettings() {
  const user = auth.currentUser;
  return <>
    <PageHeading icon="account" title="Account settings" description="Review the account you use to sign in to Menurithm." />
    <Card variant="outlined" sx={{ maxWidth: 640 }}>
      <CardContent>
        <Typography component="h2" variant="h6" gutterBottom>Sign-in details</Typography>
        {user ? <Stack component="dl" spacing={2} sx={{ mb: 0 }}>
          {[
            ["Name", user.displayName || "Not set"],
            ["Sign-in email", user.email || "Not available"],
            ["Email verification", user.emailVerified ? "Verified" : "Not verified"],
          ].map(([label, value]) => <Box key={label}>
            <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
            <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>{value}</Typography>
          </Box>)}
        </Stack> : <Alert severity="warning">Sign in to view your account details.</Alert>}
        {user && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Account details are currently read-only.
        </Typography>}
      </CardContent>
    </Card>
  </>;
}
