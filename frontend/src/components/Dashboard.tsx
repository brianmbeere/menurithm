import { Typography, Container, Grid, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const Dashboard = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom color={ theme.palette.primary.dark}>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color={theme.palette.text.secondary} gutterBottom>
        Welcome to Menurithm, your intelligent menu planning assistant. This dashboard will soon display key insights into your restaurant’s operations — including real-time inventory levels, sales performance, and generated menu suggestions.
      </Typography>

      {/* Placeholder for future statistics */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid columns={{ xs: 12, sm: 6, md: 4 }} >
          <Paper
            elevation={2}
            sx={{ p: 3, textAlign: "center", minHeight: 100 }}
          >
            <Typography variant="subtitle1" color={theme.palette.text.secondary}>
              Inventory Items
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              Coming Soon
            </Typography>
          </Paper>
        </Grid>

        <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
          <Paper
            elevation={2}
            sx={{ p: 3, textAlign: "center", minHeight: 100 }}
          >
            <Typography variant="subtitle1" color={theme.palette.text.secondary}>
              Total Sales (This Month)
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              Coming Soon
            </Typography>
          </Paper>
        </Grid>

        <Grid columns={{ xs: 12, sm: 6, md: 4 }} >
          <Paper
            elevation={2}
            sx={{ p: 3, textAlign: "center", minHeight: 100 }}
          >
            <Typography variant="subtitle1" color={theme.palette.text.secondary}>
              Suggested Dishes
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              Coming Soon
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
