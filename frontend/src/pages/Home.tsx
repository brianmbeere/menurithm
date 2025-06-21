import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  Card,
  CardContent,
  CircularProgress,
  Grid,
} from "@mui/material";
import { getGeneratedMenu } from "../api/menu";
import SalesManager from "../components/SalesManager";
import InventoryManager from "../components/InventoryManager";  
import DishManager from "../components/DishManager";

const Home = () => {
  const [menu, setMenu] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerateMenu = async () => {
    setLoading(true);
    try {
      const data = await getGeneratedMenu();
      setMenu(data.dishes);
      setRefreshKey(prev => prev + 1); // trigger inventory refresh
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" fontWeight={700} gutterBottom color="primary">
        Menurithm Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid columns={{xs:12}}>
          <InventoryManager key={refreshKey} />
        </Grid>

        <Grid columns={{xs:12}}>
          <SalesManager />
       </Grid>

      <Grid columns={{xs:12}}>
          <DishManager />
      </Grid>

        <Grid columns={{xs:12}}>
          <Card elevation={3}>
            <CardContent>
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
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;
