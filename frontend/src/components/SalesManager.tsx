import { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Grid, TextField, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  IconButton, Snackbar, Alert, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText,   DialogActions, Checkbox, Chip
} from "@mui/material";
import { type SaleInput, addSale } from "../api/addSales";
import { deleteSale } from "../api/deleteSale";
import { uploadSalesFile } from "../api/uploadSales";
import { fetchSales, type Sale } from "../api/fetchSales";
import { updateSale } from "../api/updateSale";
import { Delete, Edit, UploadFile } from "./SVGIcons";
import CSVHelpDialog from "./CSVHelpDialog";
import { formatDate } from "../utils";

const SalesManager = () => {
  const [form, setForm] = useState<SaleInput>({
    timestamp: "",
    dish_name: "",
    quantity_sold: 0,
    price_per_unit: 0,
  });
  const [editSaleId, setEditSaleId] = useState<number | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showCSVHelpDialog, setShowCSVHelpDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => { fetchSales().then(setSales).catch(console.error); }, []);
  const refreshSales = () => fetchSales().then(setSales);

  const showSnackbar = (message: string, severity: "success" | "error") => setSnackbar({ message, severity });

  const updateForm = (nextForm: SaleInput) => {
    setForm(nextForm);
    if (editSaleId === null) setIdempotencyKey(crypto.randomUUID());
  };

  const handleSubmit = async () => {
    try {
      let result: Sale | undefined;
      if (editSaleId !== null) {
        result = await updateSale(editSaleId, form);
      } else {
        result = await addSale(form, idempotencyKey);
      }
      showSnackbar(
        result?.processing_status === "needs_attention"
          ? result.processing_error || "Sale saved, but inventory was not deducted."
          : editSaleId !== null
            ? "Sale corrected and inventory history updated."
            : "Sale recorded and inventory updated.",
        result?.processing_status === "needs_attention" ? "error" : "success",
      );
      refreshSales();
      setForm({ timestamp: "", dish_name: "", quantity_sold: 0, price_per_unit: 0 });
      setEditSaleId(null);
      setIdempotencyKey(crypto.randomUUID());
    } catch (err: any) {
      showSnackbar(err.message, "error");
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      console.log('🔄 Starting sales CSV upload...', csvFile.name);
      const uploadResult = await uploadSalesFile(csvFile);
      console.log('📤 Sales upload result:', uploadResult);
      
      const duplicates = uploadResult.summary?.duplicates_skipped || 0;
      const attention = uploadResult.details?.added_sales?.filter(
        (sale: { processing_status?: string }) => sale.processing_status === "needs_attention",
      ).length || 0;
      showSnackbar(
        `CSV processed. ${duplicates} duplicate row(s) skipped; ${attention} sale(s) need attention.`,
        attention ? "error" : "success",
      );
      setCsvFile(null);
      
      console.log('🔄 Refreshing sales data...');
      await refreshSales();
      console.log('✅ Sales data refreshed');
    } catch (err: any) {
      console.error('❌ Sales upload error:', err);
      showSnackbar(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (sale: Sale) => {
    setForm({
      timestamp: sale.timestamp.slice(0, 10),
      dish_name: sale.dish.name,
      quantity_sold: sale.quantity_sold,
      price_per_unit: sale.price_per_unit,
    });
    setEditSaleId(sale.id);
  };

  const handleDelete = (id: number) => {
    setSaleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (saleToDelete === null) return;
    try {
      await deleteSale(saleToDelete);
      showSnackbar("Sale canceled; any recorded ingredient usage was restored.", "success");
      refreshSales();
    } catch (err: any) {
      showSnackbar(err.message, "error");
    } finally {
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleSelectSale = (saleId: number) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAllSales = () => {
    if (selectedSales.size === paginatedSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(paginatedSales.map(sale => sale.id)));
    }
  };

  const handleBulkDeleteSales = async () => {
    if (selectedSales.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedSales.size} sales?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedSales).map(saleId => 
        deleteSale(saleId)
      );
      await Promise.all(deletePromises);
      
      setSales(prev => prev.map(sale => selectedSales.has(sale.id)
        ? { ...sale, processing_status: "canceled", processing_error: null }
        : sale));
      setSelectedSales(new Set());
      showSnackbar(`Canceled ${selectedSales.size} sales and reversed processed usage.`, "success");
    } catch (err: any) {
      showSnackbar("Some sales failed to delete", "error");
    }
  };

  const paginatedSales = sales.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper elevation={4} sx={{ p: 4, mt: 4 }}>
      <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
        Sales Manager
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid size={{ xs:6, sm:3, md:2 }}>
          <TextField
            fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }}
            value={form.timestamp}
            onChange={(e) => updateForm({ ...form, timestamp: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs:6, sm:3, md:2 }}>
          <TextField
            fullWidth label="Dish Name"
            value={form.dish_name}
            onChange={(e) => updateForm({ ...form, dish_name: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs:6, sm:3, md:2 }}>
          <TextField
            fullWidth label="Qty" type="number"
            value={form.quantity_sold}
            onChange={(e) => updateForm({ ...form, quantity_sold: parseInt(e.target.value) })}
          />
        </Grid>
        <Grid size={{ xs:6, sm:3, md:2 }}>
          <TextField
            fullWidth label="Unit Price" type="number"
            value={form.price_per_unit}
            onChange={(e) => updateForm({ ...form, price_per_unit: parseFloat(e.target.value) })}
          />
        </Grid>
        <Grid size={{ xs:12, md:2 }}>
          <Button fullWidth variant="contained" onClick={handleSubmit}>
            {editSaleId !== null ? "Update Sale" : "Submit Sale"}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }} >
          <Button
            variant="outlined"
            onClick={() => setShowCSVHelpDialog(true)}
            fullWidth
            size="small"
          >
            CSV Help
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }} >
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
        <Grid size={{ xs: 12, sm: 5 }} >
          <Button
            fullWidth
            variant="contained"
            onClick={handleUpload}
            startIcon={<UploadFile />}
            disabled={!csvFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </Button>
       </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom>
        Recent Sales
      </Typography>
      
      {selectedSales.size > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {selectedSales.size} sale{selectedSales.size > 1 ? 's' : ''} selected
          </Typography>
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            onClick={handleBulkDeleteSales}
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
                  checked={selectedSales.size === paginatedSales.length && paginatedSales.length > 0}
                  indeterminate={selectedSales.size > 0 && selectedSales.size < paginatedSales.length}
                  onChange={handleSelectAllSales}
                />
              </TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Dish</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Inventory status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSales.map((s) => (
              <TableRow 
                key={s.id}
                style={{ backgroundColor: selectedSales.has(s.id) ? 'rgba(25, 118, 210, 0.08)' : 'transparent' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedSales.has(s.id)}
                    onChange={() => handleSelectSale(s.id)}
                  />
                </TableCell>
                <TableCell>{formatDate(s.timestamp)}</TableCell>
                <TableCell>{s.dish.name}</TableCell>
                <TableCell>{s.quantity_sold}</TableCell>
                <TableCell>${s.price_per_unit.toFixed(2)}</TableCell>
                <TableCell>
                  <Tooltip title={s.processing_error || ""}>
                    <Chip
                      size="small"
                      color={s.processing_status === "processed" ? "success" : s.processing_status === "needs_attention" ? "warning" : "default"}
                      label={s.processing_status.replace("_", " ")}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  {s.processing_status !== "canceled" && <>
                    <Tooltip title="Correct sale">
                      <IconButton onClick={() => handleEdit(s)}><Edit /></IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel sale">
                      <IconButton color="error" onClick={() => handleDelete(s.id)}><Delete /></IconButton>
                    </Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <TablePagination
        component="div"
        count={sales.length}
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
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Cancel sale</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cancel this sale? If its ingredients were deducted, Menurithm will record a reversal in inventory history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>Cancel sale</Button>
        </DialogActions>
      </Dialog>

      {/* CSV Help Dialog */}
      <CSVHelpDialog
        open={showCSVHelpDialog}
        onClose={() => setShowCSVHelpDialog(false)}
        uploadType="sales"
      />
    </Paper>
  );
};

export default SalesManager;
