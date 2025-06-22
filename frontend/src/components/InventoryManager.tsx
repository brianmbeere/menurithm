import React, { useEffect, useState } from "react";
import {
  Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, IconButton, Button, Grid,
  Divider, TablePagination
} from "@mui/material";
import { Delete, Edit, Save, UploadFile, Add } from "./SVGIcons";
import { updateInventory, type InventoryItem } from "../api/updateInventory";
import deleteInventory from "../api/deleteInventory";
import uploadInventoryFile from "../api/uploadInventoryFile";
import fetchInventory from "../api/fetchInventory";
import addInventory from "../api/addInventory";

const InventoryManager = () => {

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedRow, setEditedRow] = useState<Partial<InventoryItem>>({});
  const [newRow, setNewRow] = useState<Partial<InventoryItem>>({
    ingredient_name: "",
    quantity: "",
    unit: "",
    category: "",
    expiry_date: "",
    storage_location: ""
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInventory().then(setInventory);
  }, []);

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
    await updateInventory(updated);
    const newList = [...inventory];
    newList[globalIndex] = updated;
    setInventory(newList);
    setEditIndex(null);
  };

  const handleDelete = async (index: number) => {
    const globalIndex = inventory.findIndex(
      (item) => item.ingredient_name === filtered[index].ingredient_name
    );
    const name = inventory[globalIndex].ingredient_name;
    await deleteInventory(name);
    const updated = inventory.filter((_, i) => i !== globalIndex);
    setInventory(updated);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    try {
      await uploadInventoryFile(csvFile);
      alert("CSV uploaded successfully!");
      setCsvFile(null);
      const updated = await fetchInventory();
      setInventory(updated);
    } catch (err: any) {
      alert(err.message);
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
        unit: "",
        category: "",
        expiry_date: "",
        storage_location: ""
      });
      alert("Item added!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filtered = inventory.filter((item) =>
    [item.ingredient_name, item.category, item.storage_location]
      .some(field => field.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Inventory Manager
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search by name, category, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
          <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </Grid>
          <Grid columns={{ xs: 12, md: 4 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleUpload}
              startIcon={<UploadFile />}
              disabled={!csvFile}
            >
              Upload CSV
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        <div style={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>New</TableCell>
                <TableCell>
                  <TextField value={newRow.ingredient_name} onChange={(e) => handleNewRowChange("ingredient_name", e.target.value)} />
                </TableCell>
                <TableCell>
                  <TextField value={newRow.quantity} onChange={(e) => handleNewRowChange("quantity", e.target.value)} />
                </TableCell>
                <TableCell>
                  <TextField value={newRow.unit} onChange={(e) => handleNewRowChange("unit", e.target.value)} />
                </TableCell>
                <TableCell>
                  <TextField value={newRow.category} onChange={(e) => handleNewRowChange("category", e.target.value)} />
                </TableCell>
                <TableCell>
                  <TextField type="date" value={newRow.expiry_date} onChange={(e) => handleNewRowChange("expiry_date", e.target.value)} />
                </TableCell>
                <TableCell>
                  <TextField value={newRow.storage_location} onChange={(e) => handleNewRowChange("storage_location", e.target.value)} />
                </TableCell>
                <TableCell>
                  <IconButton onClick={handleAdd} color="primary"><Add /></IconButton>
                </TableCell>
              </TableRow>

              {paginated.map((item, i) => {
                return (
                  <TableRow key={item.ingredient_name}>
                    <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                    {editIndex === i ? (
                      <>
                        <TableCell>
                          <TextField value={editedRow.ingredient_name} onChange={(e) => handleChange("ingredient_name", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField value={editedRow.quantity} onChange={(e) => handleChange("quantity", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField value={editedRow.unit} onChange={(e) => handleChange("unit", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField value={editedRow.category} onChange={(e) => handleChange("category", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField type="date" value={editedRow.expiry_date} onChange={(e) => handleChange("expiry_date", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField value={editedRow.storage_location} onChange={(e) => handleChange("storage_location", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={handleSave} color="primary"><Save /></IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{item.ingredient_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.expiry_date}</TableCell>
                        <TableCell>{item.storage_location}</TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEdit(i)}><Edit /></IconButton>
                          <IconButton onClick={() => handleDelete(i)} color="error"><Delete /></IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

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
    </Card>
  );
};

export default InventoryManager;
