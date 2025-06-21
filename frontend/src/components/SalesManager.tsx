import React, { useState, useEffect } from "react";
import {
  Card, CardContent, Typography, Grid, TextField, Button,
  Divider, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, useMediaQuery
} from "@mui/material";
import { type SaleInput, addSale } from "../api/addSales";
import { uploadSalesFile } from "../api/uploadSales";
import { fetchSales, type Sale } from "../api/fetchSales";
import { useTheme } from "@mui/material/styles";

const SalesManager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [form, setForm] = useState<SaleInput>({
    date: "",
    dish_name: "",
    quantity_sold: 0,
    price_per_unit: 0,
  });

  const [sales, setSales] = useState<Sale[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const refreshSales = () => {
    fetchSales().then(setSales).catch(console.error);
  };

  useEffect(() => {
    refreshSales();
  }, []);

  const handleSubmit = async () => {
    try {
      await addSale(form);
      alert("Sale recorded!");
      refreshSales();
      setForm({ date: "", dish_name: "", quantity_sold: 0, price_per_unit: 0 });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      await uploadSalesFile(csvFile);
      alert("CSV uploaded!");
      setCsvFile(null);
      refreshSales();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
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
        <Typography variant="h6" gutterBottom>
          Record a Sale
        </Typography>
        <Grid container spacing={2}>
          <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                  <TableCell>{s.date}</TableCell>
                  <TableCell>{s.dish_name}</TableCell>
                  <TableCell>{s.quantity_sold}</TableCell>
                  <TableCell>${s.price_per_unit.toFixed(2)}</TableCell>
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
      </CardContent>
    </Card>
  );
};

export default SalesManager;
