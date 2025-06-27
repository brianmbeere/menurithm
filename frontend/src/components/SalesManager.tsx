import React, { useState, useEffect } from "react";
import {
  Card, CardContent, Typography, Grid, TextField, Button,
  Divider, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination,
  IconButton, Snackbar, Alert
} from "@mui/material";
import { type SaleInput, addSale } from "../api/addSales";
import { deleteSale } from "../api/deleteSale";
import { uploadSalesFile } from "../api/uploadSales";
import { fetchSales, type Sale } from "../api/fetchSales";
import { updateSale } from "../api/updateSale";
import { Delete, Edit } from "./SVGIcons";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

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
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);

  const refreshSales = () => {
    fetchSales().then(setSales).catch(console.error);
  };

  useEffect(() => {
    refreshSales();
  }, []);

  const showSnackbar = (message: string, severity: "success" | "error") => setSnackbar({ message, severity });

  const handleSubmit = async () => {
    try {
      if (editSaleId !== null) {
        await updateSale(editSaleId, form);
        showSnackbar("Sale updated!", "success");
      } else {
        await addSale(form);
        showSnackbar("Sale recorded!", "success");
      }
      refreshSales();
      setForm({ timestamp: "", dish_name: "", quantity_sold: 0, price_per_unit: 0 });
      setEditSaleId(null);
    } catch (err: any) {
      showSnackbar(err.message, "error");
    }
  };


  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      await uploadSalesFile(csvFile);
      showSnackbar("CSV uploaded!", "success");
      setCsvFile(null);
      refreshSales();
    } catch (err: any) {
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

  const handleDelete = async (id: number) => {
    setSaleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (saleToDelete === null) return;
    try {
      await deleteSale(saleToDelete);
      showSnackbar("Sale deleted", "success");
      refreshSales();
    } catch (err: any) {
      showSnackbar(err.message, "error");
    } finally {
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedSales = sales.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
      <Typography variant="h5" fontWeight={600} gutterBottom color="primary">
          Sales Manager
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }}
              value={form.timestamp}
              onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth label="Dish Name"
              value={form.dish_name}
              onChange={(e) => setForm({ ...form, dish_name: e.target.value })}
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth label="Qty" type="number"
              value={form.quantity_sold}
              onChange={(e) => setForm({ ...form, quantity_sold: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth label="Unit Price" type="number"
              value={form.price_per_unit}
              onChange={(e) => setForm({ ...form, price_per_unit: parseFloat(e.target.value) })}
            />
          </Grid>
          <Grid columns={{ xs: 12 }}>
            <Button fullWidth variant="contained" onClick={handleSubmit}>
              Submit Sale
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" gutterBottom>
          Or Upload Sales CSV
        </Typography>
        <Grid container spacing={2}>
          <Grid columns={{ xs: 12, sm: 8 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 4 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleUpload}
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
        <div style={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Dish</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.timestamp.slice(0, 10)}</TableCell>
                  <TableCell>{s.dish.name}</TableCell>
                  <TableCell>{s.quantity_sold}</TableCell>
                  <TableCell>${s.price_per_unit.toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(s)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(s.id)}><Delete/></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          component="div"
          count={sales.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
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

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Sale</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this sale?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SalesManager;
