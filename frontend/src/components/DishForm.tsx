import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { createDish, type DishInput } from "../api/createDish";

const DishForm = () => {
  const [dish, setDish] = useState<DishInput>({
    name: "",
    description: "",
    ingredients: [{ ingredient_name: "", quantity: 0, unit: "" }],
  });

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const ingredients = [...dish.ingredients];
    ingredients[index] = { ...ingredients[index], [field]: value };
    setDish({ ...dish, ingredients });
  };

  const addIngredient = () => {
    setDish({
      ...dish,
      ingredients: [...dish.ingredients, { ingredient_name: "", quantity: 0, unit: "" }],
    });
  };

  const removeIngredient = (index: number) => {
    const ingredients = dish.ingredients.filter((_, i) => i !== index);
    setDish({ ...dish, ingredients });
  };

  const handleSubmit = async () => {
    try {
      await createDish(dish);
      alert("Dish created!");
      setDish({
        name: "",
        description: "",
        ingredients: [{ ingredient_name: "", quantity: 0, unit: "" }],
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <Card elevation={3} sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Create New Dish
        </Typography>

        <Grid container spacing={2}>
          <Grid columns={{xs:12}}>
            <TextField
              fullWidth
              label="Dish Name"
              value={dish.name}
              onChange={(e) => setDish({ ...dish, name: e.target.value })}
            />
          </Grid>
          <Grid columns={{xs:12}}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={dish.description}
              onChange={(e) => setDish({ ...dish, description: e.target.value })}
            />
          </Grid>

          <Grid columns={{xs:12}}>
            <Typography variant="subtitle1">Ingredients</Typography>
            {dish.ingredients.map((ing, index) => (
              <Box key={index} display="flex" gap={2} mb={2}>
                <TextField
                  label="Name"
                  value={ing.ingredient_name}
                  onChange={(e) => handleIngredientChange(index, "ingredient_name", e.target.value)}
                />
                <TextField
                  label="Quantity"
                  type="number"
                  value={ing.quantity}
                  onChange={(e) => handleIngredientChange(index, "quantity", parseFloat(e.target.value))}
                />
                <TextField
                  label="Unit"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                />
                <Button color="error" onClick={() => removeIngredient(index)}>
                  Remove
                </Button>
              </Box>
            ))}
            <Button onClick={addIngredient} variant="outlined">
              Add Ingredient
            </Button>
          </Grid>

          <Grid columns={{xs:12}}>
            <Button variant="contained" onClick={handleSubmit}>
              Submit Dish
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DishForm;
