import { Button, Container } from "@mui/material";
import { Link } from "react-router-dom";
import { PageHeading } from "../components/WorkspaceUI";

export default function NotFound({ workspace = false }: { workspace?: boolean }) {
  return <Container maxWidth="md" sx={{ py: 5 }}>
    <PageHeading title="Page not found" description="This page may have moved or the address may be wrong."
      actions={<Button component={Link} to={workspace ? "/dashboard" : "/"} variant="contained">
        {workspace ? "Back to overview" : "Back to home"}
      </Button>} />
  </Container>;
}
