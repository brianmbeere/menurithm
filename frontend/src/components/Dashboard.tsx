import {
  Typography, Container, Grid, Paper
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

// Dummy data (replace with API calls)
const inventoryData = [
  { name: "Proteins", value: 20 },
  { name: "Vegetables", value: 30 },
  { name: "Spices", value: 15 },
  { name: "Grains", value: 25 },
];

const salesData = [
  { day: "Mon", sales: 120 },
  { day: "Tue", sales: 90 },
  { day: "Wed", sales: 140 },
  { day: "Thu", sales: 80 },
  { day: "Fri", sales: 200 },
  { day: "Sat", sales: 150 },
  { day: "Sun", sales: 170 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Dashboard = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom color={theme.palette.primary.dark}>
        Dashboard Overview
      </Typography>

      <Typography variant="body1" color={theme.palette.text.secondary} gutterBottom>
        Welcome to Menurithm, your intelligent menu planning assistant.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* Inventory */}
        <Grid sx={{ xs:12, md:4}}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Inventory Overview</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={inventoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                  {inventoryData.map((_entry,index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Sales */}
        <Grid sx={{ xs:12, md:4}}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Sales This Week</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={salesData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke={theme.palette.primary.main} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Suggested Dishes */}
        <Grid sx={{ xs:12, md:4}} >
          <Paper elevation={2} sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="subtitle1" color={theme.palette.text.secondary}>
              Suggested Dishes
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={theme.palette.primary.main}>
              12 Dishes
            </Typography>
            <Typography variant="body2" color={theme.palette.text.secondary}>
              Based on current inventory
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
