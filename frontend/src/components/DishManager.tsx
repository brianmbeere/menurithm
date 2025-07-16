import { useEffect, useState } from "react";
import {
  Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, IconButton, Button, Grid, Divider, Collapse, Box, Autocomplete,
  Snackbar, Alert, Stack
} from "@mui/material";
import { type DishIngredient, fetchDishes } from "../api/fetchDishes";
import { type DishOutput, type DishInput, createDish } from "../api/createDish";
import deleteDish from "../api/deleteDish";
import { updateDish } from "../api/updateDish";
import { Delete, Edit, ExpandLess, ExpandMore, UploadFile } from "./SVGIcons";
import fetchInventory from "../api/fetchInventory";
import uploadDishesFile from "../api/uploadDishesFile";

interface IngredientOption {
  id: number;
  ingredient_name: string;
  unit: string;
}

const IngredientInputs = ({
  index, ing, onChange, ingredientOptions
}: {
  index: number;
  ing: DishIngredient;
  onChange: (index: number, field: keyof DishIngredient, value: any) => void;
  ingredientOptions: IngredientOption[];
}) => (
  <>
    <Grid columns={{ xs: 12, sm: 4, md: 4 }}>
      <Autocomplete
        options={ingredientOptions}
        getOptionLabel={(option) => option.ingredient_name}
        value={ingredientOptions.find(opt => opt.id === ing.ingredient_id) || null}
        onChange={(_, value) => onChange(index, "ingredient_id", value ? value.id : null)}
        renderInput={(params) => <TextField {...params} label="Ingredient" />}
      />
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
  const [search, setSearch] = useState("");
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [dishForm, setDishForm] = useState<DishInput>({
    name: "",
    description: "",
    ingredients: [{ ingredient_id: 0, quantity: 1, unit: "" }]
  });
  const [editDishId, setEditDishId] = useState<number | null>(null);
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchDishes().then(setDishes);
    fetchInventory().then((data) => {
      setIngredientOptions(data.map((item: any) => ({
        id: item.id,
        ingredient_name: item.ingredient_name,
        unit: item.unit
      })));
    });
  }, []);

  const showSnackbar = (message: string, severity: "success" | "error") => setSnackbar({ message, severity });

  const handleDishChange = (field: keyof DishInput, value: string) => {
    setDishForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: keyof DishIngredient, value: any) => {
    const ingredients = [...dishForm.ingredients];
    ingredients[index] = { ...ingredients[index], [field]: value };
    // If ingredient_id changes, update unit to default from inventory
    if (field === "ingredient_id") {
      const found = ingredientOptions.find(opt => opt.id === value);
      if (found) ingredients[index].unit = found.unit;
    }
    setDishForm({ ...dishForm, ingredients });
  };

  const addIngredientField = () => {
    setDishForm({ ...dishForm, ingredients: [...dishForm.ingredients, { ingredient_id: 0, quantity: 1, unit: "" }] });
  };

  const resetForm = () => {
    setDishForm({ name: "", description: "", ingredients: [{ ingredient_id: 0, quantity: 1, unit: "" }] });
    setEditDishId(null);
    setShowIngredients(false);
  };

  const submitDish = async () => {
    try {
      if (editDishId !== null) {
        const updated = await updateDish(
          editDishId,
          {
            ...dishForm,
            ingredients: dishForm.ingredients.map(ing => ({
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit
            }))
          }
        );
        setDishes(prev => prev.map(d => (d.id === editDishId ? updated : d)));
        showSnackbar("Dish updated!", "success");
      } else {
        const newDish = await createDish({
          ...dishForm,
          ingredients: dishForm.ingredients.map(ing => ({
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity,
            unit: ing.unit
          }))
        });
        setDishes(prev => [...prev, newDish]);
        showSnackbar("Dish created!", "success");
      }
      resetForm();
    } catch (err: any) {
      showSnackbar(err.message, "error");
    }
  };

  const removeIngredientField = (index: number) => {
    const ingredients = [...dishForm.ingredients];
    ingredients.splice(index, 1);
    setDishForm({ ...dishForm, ingredients });
  };

  const handleEdit = (dish: DishOutput) => {
    setDishForm({
      name: dish.name,
      description: dish.description,
      ingredients: dish.ingredients.map(ing => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit
      }))
    });
    setEditDishId(dish.id);
    setShowIngredients(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this dish?")) return;
    try {
      await deleteDish(id);
      setDishes(prev => prev.filter(d => d.id !== id));
      showSnackbar("Dish deleted!", "success");
    } catch (err: any) {
      showSnackbar(err.message, "error");
    }
  };

  const handleCSVUploadDish = async () => {
   if (!csvFile) return;
    try {
      await uploadDishesFile(csvFile);
      setCsvFile(null);
      const updated = await fetchDishes();
      setDishes(updated);
      showSnackbar("CSV uploaded successfully!", "success");
    } catch (err: any) {
      showSnackbar(err.message, "error");
    }
  };


  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h5" fontWeight={600} gutterBottom color="primary">
          Dish Manager
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Upload Section */}
        <Typography variant="subtitle1" gutterBottom>Upload Dishes CSV</Typography>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid columns={{ xs: 12, sm: 4 }} >
            <TextField
              fullWidth
              placeholder="Search by name, category, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 4 }} >
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFile />}
              fullWidth
            >
              Choose CSV File
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </Button>
          </Grid>
          <Grid columns={{ xs: 12, sm: 4 }} >
            <Button
              fullWidth
              variant="contained"
              onClick={handleCSVUploadDish}
              startIcon={<UploadFile />}
              disabled={!csvFile}
            >
              Upload
            </Button>
          </Grid>
        </Grid>

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
              <Stack key={i} spacing={2} direction="column">
                <IngredientInputs index={i} ing={ing} onChange={handleIngredientChange} ingredientOptions={ingredientOptions} />
                <Button onClick={() => removeIngredientField(i)}>Remove</Button>
              </Stack>
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
                      {(dish.ingredients || []).map((ing, i) => (
                        <li key={i}>{('ingredient_name' in ing && (ing as any).ingredient_name) ? (ing as any).ingredient_name : `Ingredient #${ing.ingredient_id}`} – {ing.quantity} {ing.unit}</li>
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

        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
            {snackbar?.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default DishManager;
