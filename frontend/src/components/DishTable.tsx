import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  IconButton,
  Box,
} from "@mui/material";
import { fetchDishes, type Dish } from "../api/fetchDishes";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

const DishTable = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [openRow, setOpenRow] = useState<number | null>(null);

  useEffect(() => {
    fetchDishes()
      .then(setDishes)
      .catch(console.error);
  }, []);

  const toggleRow = (id: number) => {
    setOpenRow(openRow === id ? null : id);
  };

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Created Dishes
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Dish Name</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dishes.map((dish) => (
              <React.Fragment key={dish.id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(dish.id)}>
                      {openRow === dish.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{dish.name}</TableCell>
                  <TableCell>{dish.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} sx={{ paddingBottom: 0, paddingTop: 0 }}>
                    <Collapse in={openRow === dish.id} timeout="auto" unmountOnExit>
                      <Box margin={2}>
                        <Typography variant="subtitle1">Ingredients:</Typography>
                        <ul>
                          {dish.ingredients.map((ing, idx) => (
                            <li key={idx}>
                              {ing.ingredient_name} – {ing.quantity} {ing.unit}
                            </li>
                          ))}
                        </ul>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DishTable;
