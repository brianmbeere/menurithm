import React, { useState, useEffect } from "react";
import {
  Card, CardContent, Typography, Grid, TextField, Button, Divider, Table, TableHead,
  TableRow, TableCell, TableBody
} from "@mui/material";
import { type SaleInput, addSale } from "../api/addSales";
import { uploadSalesFile } from "../api/uploadSales";
import { fetchSales, type Sale } from "../api/fetchSales";

const SalesManager = () => {
  const [form, setForm] = useState<SaleInput>({
    date: "",
    dish_name: "",
    quantity_sold: 0,
    price_per_unit: 0,
  });

  const [sales, setSales] = useState<Sale[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Record a Sale
        </Typography>
        <Grid container spacing={2}>
          <Grid columns={{ xs: 6}}>
            <TextField
              fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Grid>
          <Grid columns={{ xs: 6 }}>
            <TextField
              fullWidth label="Dish Name"
              value={form.dish_name}
              onChange={(e) => setForm({ ...form, dish_name: e.target.value })}
            />
          </Grid>
          <Grid columns={{ xs: 6 }}>
            <TextField
              fullWidth label="Quantity Sold" type="number"
              value={form.quantity_sold}
              onChange={(e) => setForm({ ...form, quantity_sold: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid columns={{ xs: 6 }}>
            <TextField
              fullWidth label="Price Per Unit" type="number"
              value={form.price_per_unit}
              onChange={(e) => setForm({ ...form, price_per_unit: parseFloat(e.target.value) })}
            />
          </Grid>
          <Grid columns={{ xs: 12 }}>
            <Button variant="contained" onClick={handleSubmit}>
              Submit Sale
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" gutterBottom>
          Or Upload Sales CSV
        </Typography>
        <Grid container spacing={2}>
            <Grid columns={{ xs: 8 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </Grid>
          <Grid columns={{ xs: 4 }}>
            <Button
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
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.date}</TableCell>
                <TableCell>{s.dish_name}</TableCell>
                <TableCell>{s.quantity_sold}</TableCell>
                <TableCell>${s.price_per_unit.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SalesManager;