import { useEffect,useState } from 'react'
import {
  Typography,
  Container,
  Grid,
  Paper,
  CircularProgress,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import fetchInventorySummary  from "../api/fetchInventorySummary";
import { fetchSales } from "../api/fetchSales";
import groupSalesByDay from '../hooks/groupSalesData';


// Dummy data


const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Dashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState<{ day: string; sales: number }[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
  const loadInventorySummary = async () => {
    try {
      const summary = await fetchInventorySummary();
      setInventoryData(summary);
    } catch (err) {
      console.error("Failed to load inventory summary", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      //const grouped = { }
      const rawSales = await fetchSales();
      const grouped = groupSalesByDay(rawSales);
      setSalesData(grouped);
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setSalesLoading(false);
    }
  };

  loadSales();
  loadInventorySummary();
}, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Typography
        variant="h4"
        fontWeight={700}
        gutterBottom
        color={theme.palette.primary.dark}
      >
        Dashboard Overview
      </Typography>
      <Typography
        variant="body1"
        color={theme.palette.text.secondary}
        gutterBottom
      >
        Welcome to Menurithm, your intelligent menu planning assistant.
      </Typography>

      {/* Charts */}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Inventory Chart - now 6/12 wide */}
        <Grid sx={{ xs:6, md:12}}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Inventory Overview
            </Typography>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {inventoryData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Sales Chart - also 6/12 wide */}
        <Grid sx={{ xs:12, md:6}}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sales This Week
            </Typography>
            {salesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke={theme.palette.primary.main}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Suggested Dishes - full width */}
        <Grid sx={{ xs:12}}>
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
