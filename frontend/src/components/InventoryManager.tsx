import React, { useEffect, useState } from "react";
import {
  CardContent, Typography, Table, TableHead, TableRow,Autocomplete,
  TableCell, TableBody, TextField, IconButton, Button, Grid,
  Divider, TablePagination, Tooltip, Snackbar, Alert, Paper, Box,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { Delete, Edit, Save, UploadFile, Add } from "./SVGIcons";
import { updateInventory, type InventoryItem } from "../api/updateInventory";
import deleteInventory from "../api/deleteInventory";
import uploadInventoryFile from "../api/uploadInventoryFile";
import fetchInventory from "../api/fetchInventory";
import addInventory from "../api/addInventory";
import { advancedInventoryAPI } from "../api/advancedInventory";
import CSVHelpDialog from "./CSVHelpDialog";
import ProduceOrderDialog from "./ProduceOrderDialog";
import { formatDate } from "../utils";
import { fetchInventoryMovements, type InventoryMovement } from "../api/fetchInventoryMovements";
import { fetchLowStockInventory } from "../api/fetchLowStockInventory";

const InventoryManager = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedRow, setEditedRow] = useState<Partial<InventoryItem>>({});
  const [newRow, setNewRow] = useState<Partial<InventoryItem>>({
    ingredient_name: "",
    quantity: "",
    reorder_point: "0",
    unit: "",
    category: "",
    expiry_date: "",
    storage_location: ""
  });
  const CATEGORY_OPTIONS = [
  "Vegetables", "Grains", "Dairy", "Herbs", "Spices",
  "Poultry", "Meat", "Seafood", "Beverages"
 ];
 const UNIT_OPTIONS = [
  "pounds (lb)", "kilograms (kg)", "bunch", "liters (L)", "pieces", "packs"
 ];

  const STORAGE_OPTIONS = [
    "Pantry", "Fridge", "Freezer", "Cellar", "Dry Storage"
  ];
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showCSVHelpDialog, setShowCSVHelpDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [produceOrderDialogOpen, setProduceOrderDialogOpen] = useState(false);
  const [produceInventoryItemId, setProduceInventoryItemId] = useState<number | undefined>();
  const [historyItem, setHistoryItem] = useState<string | null>(null);
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    Promise.all([fetchInventory(), fetchLowStockInventory()])
      .then(([items, lowStock]) => {
        setInventory(items);
        setLowStockItems(lowStock);
      })
      .catch(() => showSnackbar("Failed to load inventory and reorder alerts", "error"));
  }, []);

  const refreshInventory = async () => {
    const [items, lowStock] = await Promise.all([fetchInventory(), fetchLowStockInventory()]);
    setInventory(items);
    setLowStockItems(lowStock);
  };

  const showSnackbar = (message: string, severity: "success" | "error") =>
    setSnackbar({ message, severity });

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditedRow({ ...filtered[index] });
  };

  const handleChange = (field: keyof InventoryItem, value: string) => {
    setEditedRow((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (editIndex === null) return;
    const globalIndex = inventory.findIndex(
      (item) => item.ingredient_name === filtered[editIndex].ingredient_name
    );
    const updated = { ...inventory[globalIndex], ...editedRow };
    try {
      if (updated.quantity !== inventory[globalIndex].quantity) {
        const reason = window.prompt("Why are you adjusting this stock quantity?");
        if (!reason?.trim()) return;
        await updateInventory({ ...updated, adjustment_reason: reason.trim() });
      } else {
        await updateInventory(updated);
      }
      const newList = [...inventory];
      newList[globalIndex] = updated;
      setInventory(newList);
      setEditIndex(null);
      setLowStockItems(await fetchLowStockInventory());
      showSnackbar("Item updated successfully", "success");
    } catch {
      showSnackbar("Failed to update item", "error");
    }
  };

  const handleShowHistory = async (ingredientName: string) => {
    setHistoryItem(ingredientName);
    setHistory([]);
    setHistoryError("");
    try {
      setHistory(await fetchInventoryMovements(ingredientName));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load inventory history");
    }
  };

  const handleDelete = async (index: number) => {
    const globalIndex = inventory.findIndex(
      (item) => item.ingredient_name === filtered[index].ingredient_name
    );
    try {
      await deleteInventory(inventory[globalIndex].ingredient_name);
      setInventory(inventory.filter((_, i) => i !== globalIndex));
      showSnackbar("Item deleted", "success");
    } catch {
      showSnackbar("Delete failed", "error");
    }
  };

  const handleSelectItem = (itemName: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemName)) {
      newSelected.delete(itemName);
    } else {
      newSelected.add(itemName);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map(item => item.ingredient_name)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedItems).map(itemName => 
        deleteInventory(itemName)
      );
      await Promise.all(deletePromises);
      
      setInventory(prev => 
        prev.filter(item => !selectedItems.has(item.ingredient_name))
      );
      setSelectedItems(new Set());
      showSnackbar(`Successfully deleted ${selectedItems.size} items`, "success");
    } catch (err: any) {
      showSnackbar("Some items failed to delete", "error");
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    try {
      await uploadInventoryFile(csvFile);
      setCsvFile(null);
      const updated = await fetchInventory();
      setInventory(updated);
      setLowStockItems(await fetchLowStockInventory());
      showSnackbar("CSV uploaded successfully!", "success");
    } catch (err: any) {
      showSnackbar(err.message || "Upload failed", "error");
    }
  };

  const handleNewRowChange = (field: keyof InventoryItem, value: string) => {
    setNewRow((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    try {
      const added = await addInventory(newRow as InventoryItem);
      setInventory([added, ...inventory]);
      setNewRow({
        ingredient_name: "",
        quantity: "",
        reorder_point: "0",
        unit: "",
        category: "",
        expiry_date: "",
        storage_location: ""
      });
      await refreshInventory();
      showSnackbar("Item added!", "success");
    } catch (err: any) {
      showSnackbar(err.message || "Add failed", "error");
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // AI-Powered Feature Handlers
  const handleAIOptimization = async () => {
    try {
      setSnackbar({ message: "🤖 Running AI optimization...", severity: "success" });
      await advancedInventoryAPI.runOptimization();
      setSnackbar({ message: "✅ AI optimization completed!", severity: "success" });
    } catch (error) {
      setSnackbar({ message: "❌ AI optimization failed", severity: "error" });
    }
  };

  const handleAutoOrder = async () => {
    try {
      setSnackbar({ message: "🚛 Creating auto orders...", severity: "info" });
      const result = await advancedInventoryAPI.createAutoOrder();
      setSnackbar({ 
        message: `✅ Created ${result.orders_created} orders ($${result.total_estimated_cost.toFixed(2)})`, 
        severity: "success" 
      });
    } catch (error) {
      setSnackbar({ message: "❌ Auto order failed", severity: "error" });
    }
  };

  const handleSmartAlerts = async () => {
    try {
      const alertsData = await advancedInventoryAPI.getAlerts('high');
      const alertCount = alertsData.alerts.length;
      setSnackbar({ 
        message: `🚨 Found ${alertCount} high-priority alerts`, 
        severity: alertCount > 0 ? "error" : "success" 
      });
    } catch (error) {
      setSnackbar({ message: "❌ Failed to fetch alerts", severity: "error" });
    }
  };

  const filtered = inventory.filter((item) =>
    [item.ingredient_name, item.category, item.storage_location]
      .some(field => field.toLowerCase().includes(search.toLowerCase()))
  );
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ mt: 4, p: 2 }}>
      <CardContent>
        <Typography variant="h5" fontWeight={600} gutterBottom color="primary">
          Inventory Manager
        </Typography>

        <Divider sx={{ my: 2 }} />
        {lowStockItems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {lowStockItems.length} ingredient{lowStockItems.length === 1 ? "" : "s"} at or below your reorder point.
            Review the flagged items and source produce from current Croprithm listings.
          </Alert>
        )}

        {/* Upload Section */}
        <Typography variant="subtitle1" gutterBottom>Upload Inventory CSV</Typography>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 3 }} >
            <TextField
              fullWidth
              placeholder="Search by name, category, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }} >
            <Button
              variant="outlined"
              onClick={() => setShowCSVHelpDialog(true)}
              fullWidth
              size="small"
            >
              CSV Help
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }} >
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
          <Grid size={{ xs: 12, sm: 4 }} >
            <Button
              fullWidth
              variant="contained"
              onClick={handleUpload}
              startIcon={<UploadFile />}
              disabled={!csvFile}
            >
              Upload
            </Button>
          </Grid>
        </Grid>

        {/* AI-Powered Features Section */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>🤖 AI-Powered Features</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 2.4 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleAIOptimization}
              sx={{ color: 'primary.main' }}
            >
              ✨ AI Optimization
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 2.4 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleAutoOrder}
              sx={{ color: 'success.main' }}
            >
              🚛 Auto Order
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 2.4 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => setProduceOrderDialogOpen(true)}
              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
            >
              🥬 Order Produce
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 2.4 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSmartAlerts}
              sx={{ color: 'warning.main' }}
            >
              🚨 Smart Alerts
            </Button>
          </Grid>
        </Grid>

        {/* Bulk Actions Section */}
        {selectedItems.size > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedItems.size} items selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={handleBulkDelete}
              size="small"
            >
              Delete Selected
            </Button>
          </Box>
        )}

        {/* Table Section */}
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>
                  <Checkbox
                    indeterminate={selectedItems.size > 0 && selectedItems.size < filtered.length}
                    checked={filtered.length > 0 && selectedItems.size === filtered.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Reorder point</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Add New Row */}
              <TableRow sx={{ backgroundColor: "#fafafa" }}>
                  <TableCell></TableCell>
                  <TableCell>New</TableCell>
                  {["ingredient_name", "quantity", "reorder_point", "unit", "category", "expiry_date", "storage_location"].map((field) => (
                    <TableCell key={field}>
                      {["unit", "category", "storage_location"].includes(field) ? (
                        <Autocomplete
                          size="medium"
                          options={
                            field === "unit" ? UNIT_OPTIONS :
                            field === "category" ? CATEGORY_OPTIONS :
                            STORAGE_OPTIONS
                          }
                          freeSolo
                          value={(newRow as any)[field] || ""}
                          onChange={(_, value) => handleNewRowChange(field as keyof InventoryItem, value || "")}
                          renderInput={(params) => (
                            <TextField {...params} placeholder={field.replace("_", " ")} />
                          )}
                        />
                      ) : (
                        <TextField
                          size="medium"
                          type={field === "expiry_date" ? "date" : field === "quantity" || field === "reorder_point" ? "number" : "text"}
                          placeholder={field.replace("_", " ")}
                          value={(newRow as any)[field]}
                          onChange={(e) => handleNewRowChange(field as keyof InventoryItem, e.target.value)}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Tooltip title="Add Item">
                      <IconButton onClick={handleAdd} color="primary">
                        <Add />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
              </TableRow>
              {paginated.map((item, i) => (
                <TableRow
                  key={item.ingredient_name}
                  hover
                  sx={{ 
                    transition: "background-color 0.3s",
                    backgroundColor: selectedItems.has(item.ingredient_name) ? 'action.selected' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.ingredient_name)}
                      onChange={() => handleSelectItem(item.ingredient_name)}
                    />
                  </TableCell>
                  <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                  {editIndex === i ? (
                    <>
                      {["ingredient_name", "quantity", "reorder_point", "unit", "category", "expiry_date", "storage_location"].map((field: any) => (
                        <TableCell key={field}>
                          <TextField
                            size="small"
                            type={field === "expiry_date" ? "date" : field === "quantity" || field === "reorder_point" ? "number" : "text"}
                            value={(editedRow as any)[field]}
                            onChange={(e) => handleChange(field, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Tooltip title="Save Changes">
                          <IconButton onClick={handleSave} color="primary">
                            <Save />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{item.ingredient_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.reorder_point}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{formatDate(item.expiry_date)}</TableCell>
                      <TableCell>{item.storage_location}</TableCell>
                      <TableCell>
                        {lowStockItems.some(lowStock => lowStock.id === item.id) && (
                          <Tooltip title="Find this ingredient in Croprithm">
                            <Button size="small" onClick={() => {
                              setProduceInventoryItemId(item.id);
                              setProduceOrderDialogOpen(true);
                            }}>Source</Button>
                          </Tooltip>
                        )}
                        <Tooltip title="Inventory history">
                          <Button size="small" onClick={() => void handleShowHistory(item.ingredient_name)}>History</Button>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleEdit(i)}><Edit /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(i)} color="error">
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </CardContent>

      {/* CSV Help Dialog */}
      <CSVHelpDialog
        open={showCSVHelpDialog}
        onClose={() => setShowCSVHelpDialog(false)}
        uploadType="inventory"
      />

      {/* Produce Order Dialog */}
      <ProduceOrderDialog
        open={produceOrderDialogOpen}
        initialInventoryItemId={produceInventoryItemId}
        onClose={() => {
          setProduceOrderDialogOpen(false);
          setProduceInventoryItemId(undefined);
        }}
        onSuccess={(result) => {
          setSnackbar({
            message: result.message,
            severity: "success"
          });
        }}
        onError={(error) => {
          setSnackbar({
            message: `❌ Order failed: ${error}`,
            severity: "error"
          });
        }}
      />

      <Dialog open={historyItem !== null} onClose={() => setHistoryItem(null)} fullWidth maxWidth="md">
        <DialogTitle>Inventory history: {historyItem}</DialogTitle>
        <DialogContent>
          {historyError && <Alert severity="error">{historyError}</Alert>}
          {!historyError && history.length === 0 && <Typography>No stock movements recorded.</Typography>}
          {history.map(movement => (
            <Box key={movement.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography fontWeight={600}>
                {movement.movement_type.replace(/_/g, " ")} · {movement.quantity_change} {movement.unit}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {movement.quantity_before} → {movement.quantity_after} {movement.unit} · {movement.reason} · {formatDate(movement.created_at)}
                {movement.sale_id ? ` · Sale #${movement.sale_id}` : ""}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryItem(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Paper>
  );
};

export default InventoryManager;
