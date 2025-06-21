import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem
} from "@mui/material";

import { getGeneratedMenu } from "../api/menu";
import InventoryUpload from "../components/InventoryUpload";
import SalesUpload from "../components/SalesUpload";
import InventoryList from "../components/InventoryList";
import SalesList from "../components/SalesList";
import DishForm from "../components/DishForm";
import DishTable from "../components/DishTable";

const Home = () => {
  const [menu, setMenu] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getGeneratedMenu()
      .then((data) => setMenu(data.dishes))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom align="center" color="primary">
        Menurithm Dashboard
      </Typography>

      <Grid container spacing={3}>
          <Grid columns={{xs:12}}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Inventory
              </Typography>
              <InventoryUpload />
            </CardContent>
          </Card>
        </Grid>

        <Grid columns={{xs:12}}>
          <InventoryList />
        </Grid>

        <Grid columns={{xs:12}}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Sales History
              </Typography>
              <SalesUpload />
            </CardContent>
          </Card>
        </Grid>
        <Grid columns={{xs:12}}>
            <DishForm />
        </Grid>
        
        <Grid columns={{xs:12}}>
          <DishTable />
        </Grid>

        <Grid columns={{xs:12}}>
          <Card elevation={3} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Menu Suggestions
              </Typography>
              {loading ? (
                <CircularProgress />
              ) : (
                <List dense>
                  {menu.map((item, i) => (
                    <ListItem key={i}>
                      <Typography>{item}</Typography>
                    </ListItem>
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
