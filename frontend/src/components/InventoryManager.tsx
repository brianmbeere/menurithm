import React, { useEffect, useState } from "react";
import {
  Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TextField, IconButton, Button, Grid, Divider
} from "@mui/material";
import { Delete, Edit, Save, UploadFile } from "@mui/icons-material";
import { updateInventory, type InventoryItem} from "../api/updateInventory";
import deleteInventory from "../api/deleteInventory";
import uploadInventoryFile from "../api/uploadInventoryFile";
import fetchInventory  from "../api/fetchInventory";


const InventoryManager = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedRow, setEditedRow] = useState<Partial<InventoryItem>>({});
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    fetchInventory().then(setInventory);
  }, []);

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditedRow({ ...inventory[index] });
  };

  const handleChange = (field: keyof InventoryItem, value: string) => {
    setEditedRow((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (editIndex === null) return;
    const updated = { ...inventory[editIndex], ...editedRow };
    await updateInventory(updated);
    const newList = [...inventory];
    newList[editIndex] = updated;
    setInventory(newList);
    setEditIndex(null);
  };

  const handleDelete = async (index: number) => {
    const name = inventory[index].ingredient_name;
    await deleteInventory(name);
    const updated = inventory.filter((_, i) => i !== index);
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

  return (
    <Card sx={{ mt: 4 }} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Inventory Manager
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid columns={{xs:8}}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </Grid>
          <Grid columns={{xs:4}}>
            <Button
              variant="outlined"
              onClick={handleUpload}
              startIcon={<UploadFile />}
              disabled={!csvFile}
            >
              Upload CSV
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Table>
          <TableHead>
            <TableRow>
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
            {inventory.map((item, i) => (
              <TableRow key={item.ingredient_name}>
                {editIndex === i ? (
                  <>
                    <TableCell>
                      <TextField
                        value={editedRow.ingredient_name || ""}
                        onChange={(e) => handleChange("ingredient_name", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editedRow.quantity || ""}
                        onChange={(e) => handleChange("quantity", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editedRow.unit || ""}
                        onChange={(e) => handleChange("unit", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editedRow.category || ""}
                        onChange={(e) => handleChange("category", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        value={editedRow.expiry_date || ""}
                        onChange={(e) => handleChange("expiry_date", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editedRow.storage_location || ""}
                        onChange={(e) => handleChange("storage_location", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={handleSave} color="primary">
                        <Save />
                      </IconButton>
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
                      <IconButton onClick={() => handleEdit(i)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(i)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default InventoryManager;
