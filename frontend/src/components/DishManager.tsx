import React, { useEffect, useState } from "react";
import {
  Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, IconButton, Button, Grid, Divider, Collapse, Box
} from "@mui/material";
import { Delete, Edit, ExpandMore, ExpandLess } from "@mui/icons-material";
import { type DishIngredient, fetchDishes } from "../api/fetchDishes";
import { type DishOutput, type DishInput, createDish } from "../api/createDish";
import deleteDish from "../api/deleteDish";
import { updateDish } from "../api/updateDish";

const IngredientInputs = ({
  index, ing, onChange
}: {
  index: number;
  ing: DishIngredient;
  onChange: (index: number, field: keyof DishIngredient, value: string | number) => void;
}) => (
  <>
    <Grid columns={{ xs: 12, sm: 4, md: 4 }}>
      <TextField fullWidth label="Ingredient" value={ing.ingredient_name} onChange={(e) => onChange(index, "ingredient_name", e.target.value)} />
    </Grid>
    <Grid columns={{ xs: 12, sm: 4, md: 4 }}>
      <TextField fullWidth label="Quantity" type="number" value={ing.quantity} onChange={(e) => onChange(index, "quantity", parseFloat(e.target.value))} />
    </Grid>
    <Grid columns={{ xs: 12, sm: 4, md: 4 }}>
      <TextField fullWidth label="Unit" value={ing.unit} onChange={(e) => onChange(index, "unit", e.target.value)} />
    </Grid>
  </>
);

const DishManager = () => {
  const [dishes, setDishes] = useState<DishOutput[]>([]);
  const [dishForm, setDishForm] = useState<DishInput>({
    name: "",
    description: "",
    ingredients: [{ ingredient_name: "", quantity: 1, unit: "" }]
  });
  const [editDishId, setEditDishId] = useState<number | null>(null);
  const [showIngredients, setShowIngredients] = useState<boolean>(false);

  useEffect(() => {
    fetchDishes().then(setDishes);
  }, []);

  const handleDishChange = (field: keyof DishInput, value: string) => {
    setDishForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: keyof DishIngredient, value: string | number) => {
    const ingredients = [...dishForm.ingredients];
    ingredients[index] = { ...ingredients[index], [field]: value };
    setDishForm({ ...dishForm, ingredients });
  };

  const addIngredientField = () => {
    setDishForm({ ...dishForm, ingredients: [...dishForm.ingredients, { ingredient_name: "", quantity: 1, unit: "" }] });
  };

  const resetForm = () => {
    setDishForm({ name: "", description: "", ingredients: [{ ingredient_name: "", quantity: 1, unit: "" }] });
    setEditDishId(null);
    setShowIngredients(false);
  };

  const submitDish = async () => {
    try {
      if (editDishId !== null) {
        const updated = await updateDish(editDishId, dishForm);
        setDishes(prev => prev.map(d => (d.id === editDishId ? updated : d)));
        alert("Dish updated!");
      } else {
        const newDish = await createDish(dishForm);
        setDishes(prev => [...prev, newDish]);
        alert("Dish created!");
      }
      resetForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (dish: DishOutput) => {
    setDishForm({ name: dish.name, description: dish.description, ingredients: dish.ingredients });
    setEditDishId(dish.id);
    setShowIngredients(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this dish?")) return;
    try {
      await deleteDish(id);
      setDishes(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Dish Manager
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          {editDishId !== null ? "Edit Dish" : "Create Dish"}
        </Typography>

        <Grid container spacing={2}>
          <Grid columns={{ xs: 12, sm: 6, md: 6 }}>
            <TextField fullWidth label="Dish Name" value={dishForm.name} onChange={(e) => handleDishChange("name", e.target.value)} />
          </Grid>
          <Grid columns={{ xs: 12, sm: 6, md: 6 }}>
            <TextField fullWidth label="Description" value={dishForm.description} onChange={(e) => handleDishChange("description", e.target.value)} />
          </Grid>

          <Grid columns={{ xs: 12 }}>
            <Button onClick={() => setShowIngredients(prev => !prev)} startIcon={showIngredients ? <ExpandLess /> : <ExpandMore />}>
              {showIngredients ? "Hide Ingredients" : "Add Ingredients"}
            </Button>
          </Grid>

          <Collapse in={showIngredients} timeout={400} style={{ width: "100%" }}>
            <Grid container spacing={2}>
              {dishForm.ingredients.map((ing, i) => (
                <IngredientInputs key={i} index={i} ing={ing} onChange={handleIngredientChange} />
              ))}
              <Grid columns={{ xs: 12 }}>
                <Button onClick={addIngredientField}>Add Ingredient</Button>
              </Grid>
            </Grid>
          </Collapse>

          <Grid columns={{ xs: 12 }}>
            <Button variant="contained" onClick={submitDish} sx={{ mt: 2 }}>
              {editDishId !== null ? "Update Dish" : "Save Dish"}
            </Button>
            {editDishId !== null && (
              <Button onClick={resetForm} sx={{ ml: 2, mt: 2 }}>
                Cancel
              </Button>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Dishes
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Ingredients</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dishes.map((dish) => (
                <TableRow key={dish.id}>
                  <TableCell>{dish.name}</TableCell>
                  <TableCell>{dish.description}</TableCell>
                  <TableCell>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {dish.ingredients.map((ing, i) => (
                        <li key={i}>{ing.ingredient_name} – {ing.quantity} {ing.unit}</li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(dish)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(dish.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DishManager;
