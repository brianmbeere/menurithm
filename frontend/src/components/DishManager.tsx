import { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Button,
  TextField, Grid, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, IconButton, Divider, Checkbox, Card, CardContent, Autocomplete, Collapse, Stack,
  Snackbar, Alert
} from "@mui/material";
import { type DishIngredient, fetchDishes } from "../api/fetchDishes";
import { type DishOutput, type DishInput, createDish } from "../api/createDish";
import deleteDish from "../api/deleteDish";
import { updateDish } from "../api/updateDish";
import { Delete, Edit, ExpandLess, ExpandMore, UploadFile } from "./SVGIcons";
import fetchInventory from "../api/fetchInventory";
import uploadDishesFile from "../api/uploadDishesFile";
import CSVHelpDialog from "./CSVHelpDialog";

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
  const [selectedDishes, setSelectedDishes] = useState<Set<number>>(new Set());
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
  const [showCSVHelpDialog, setShowCSVHelpDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Memoized filtered and paginated dishes for better performance
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => 
      dish.name.toLowerCase().includes(search.toLowerCase()) ||
      (dish.description && dish.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [dishes, search]);

  const paginatedDishes = useMemo(() => {
    return filteredDishes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredDishes, page, rowsPerPage]);

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
      console.log('🔄 Starting CSV upload...', csvFile.name);
      const uploadResult = await uploadDishesFile(csvFile);
      console.log('📤 Upload result:', uploadResult);
      
      setCsvFile(null);
      
      console.log('🔄 Fetching updated dishes...');
      const updated = await fetchDishes();
      console.log('📥 Fetched dishes:', updated.length, 'dishes');
      
      setDishes(updated);
      showSnackbar("CSV uploaded successfully!", "success");
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      showSnackbar(err.message, "error");
    }
  };

  const handleSelectDish = (dishId: number) => {
    const newSelected = new Set(selectedDishes);
    if (newSelected.has(dishId)) {
      newSelected.delete(dishId);
    } else {
      newSelected.add(dishId);
    }
    setSelectedDishes(newSelected);
  };

  const handleSelectAllDishes = () => {
    if (selectedDishes.size === paginatedDishes.length) {
      setSelectedDishes(new Set());
    } else {
      setSelectedDishes(new Set(paginatedDishes.map(dish => dish.id)));
    }
  };

  const handleBulkDeleteDishes = async () => {
    if (selectedDishes.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedDishes.size} dishes?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedDishes).map(dishId => 
        deleteDish(dishId)
      );
      await Promise.all(deletePromises);
      
      setDishes(prev => prev.filter(dish => !selectedDishes.has(dish.id)));
      setSelectedDishes(new Set());
      showSnackbar(`Successfully deleted ${selectedDishes.size} dishes`, "success");
    } catch (err: any) {
      showSnackbar("Some dishes failed to delete", "error");
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
          <Grid columns={{ xs: 12, sm: 3 }} >
            <TextField
              fullWidth
              placeholder="Search by name or description"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0); // Reset to first page when searching
              }}
              size="small"
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 2 }} >
            <Button
              variant="outlined"
              onClick={() => setShowCSVHelpDialog(true)}
              fullWidth
              size="small"
            >
              CSV Help
            </Button>
          </Grid>
          <Grid columns={{ xs: 12, sm: 3 }} >
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

        {selectedDishes.size > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedDishes.size} dish{selectedDishes.size > 1 ? 'es' : ''} selected
            </Typography>
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              onClick={handleBulkDeleteDishes}
              startIcon={<Delete />}
            >
              Delete Selected
            </Button>
          </Box>
        )}

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedDishes.size === paginatedDishes.length && paginatedDishes.length > 0}
                    indeterminate={selectedDishes.size > 0 && selectedDishes.size < paginatedDishes.length}
                    onChange={handleSelectAllDishes}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Ingredients</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDishes.map((dish) => (
                <TableRow 
                  key={dish.id}
                  style={{ backgroundColor: selectedDishes.has(dish.id) ? 'rgba(25, 118, 210, 0.08)' : 'transparent' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedDishes.has(dish.id)}
                      onChange={() => handleSelectDish(dish.id)}
                    />
                  </TableCell>
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

        <TablePagination
          component="div"
          count={filteredDishes.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />

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

        {/* CSV Help Dialog */}
        <CSVHelpDialog
          open={showCSVHelpDialog}
          onClose={() => setShowCSVHelpDialog(false)}
          uploadType="dishes"
        />
      </CardContent>
    </Card>
  );
};

export default DishManager;
