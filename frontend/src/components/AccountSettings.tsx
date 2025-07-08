import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Divider,
  Snackbar,
  Alert
} from "@mui/material";
import { useState } from "react";

const AccountSettings = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Simulate saving settings
    setSnackbarOpen(true);
    setTimeout(() => {
      navigate(-1); // Go back to previous page or dashboard
    }, 1500);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Grid container justifyContent="center" sx={{ p: 2 }}>
      <Grid sx={{ xs: 12, sm: 8, md: 6, lg: 4 }}>
        <Card sx={{ borderRadius: 4, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Account Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid sx={{ xs: 2 }} >
                <TextField
                  label="Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid sx={{xs: 12}}>
                <TextField
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid  sx={{xs: 12, sm: 6}}>
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid sx={{xs: 12, sm: 6}} >
                <TextField
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Grid
              container
              justifyContent="space-between"
              spacing={2}
              sx={{ mt: 3 }}
            >
              <Grid >
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </Grid>
              <Grid >
                <Button variant="contained" color="primary" onClick={handleSubmit}>
                  Save Changes
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Account settings saved successfully!
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default AccountSettings;