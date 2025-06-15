import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function emptyItem() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    expiryDate: '',
    storageLocation: '',
  };
}

function InventoryManager() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newItem, setNewItem] = useState(emptyItem());
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  function validateItem(item) {
    const errs = {};
    if (!item.name) errs.name = 'Required';
    if (!item.category) errs.category = 'Required';
    if (!item.quantity || item.quantity < 0) errs.quantity = 'Invalid';
    if (!item.unit) errs.unit = 'Required';
    if (!item.expiryDate) errs.expiryDate = 'Required';
    else if (new Date(item.expiryDate) < new Date()) errs.expiryDate = 'Expired';
    if (!item.storageLocation) errs.storageLocation = 'Required';
    return errs;
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const parsed = (results.data).map((row) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: row['name'] || '',
            category: row['category'] || '',
            quantity: Number(row['quantity']) || 0,
            unit: row['unit'] || '',
            expiryDate: row['expiryDate'] || '',
            storageLocation: row['storageLocation'] || '',
          }));
          setItems((prev) => [...prev, ...parsed]);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const parsed = (rows).map((row) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: row['name'] || '',
          category: row['category'] || '',
          quantity: Number(row['quantity']) || 0,
          unit: row['unit'] || '',
          expiryDate: row['expiryDate'] || '',
          storageLocation: row['storageLocation'] || '',
        }));
        setItems((prev) => [...prev, ...parsed]);
      };
      reader.readAsArrayBuffer(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleInputChange(e, id) {
    const { name, value } = e.target;
    if (id) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [name]: name === 'quantity' ? Number(value) : value } : item
        )
      );
    } else {
      setNewItem((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
    }
  }

  function handleAddRow() {
    const errs = validateItem(newItem);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setItems((prev) => [...prev, newItem]);
    setNewItem(emptyItem());
    setErrors({});
  }

  function handleEdit(id) { setEditingId(id); }
  function handleSaveEdit(id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const errs = validateItem(item);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setEditingId(null);
    setErrors({});
  }
  function handleDelete(id) { setItems((prev) => prev.filter((item) => item.id !== id)); }

  async function handleSubmit() {
    for (const item of items) {
      const errs = validateItem(item);
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
    }
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!res.ok) throw new Error('Failed to submit');
      alert('Inventory submitted successfully!');
    } catch (err) {
      alert('Error submitting inventory.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Food Inventory Manager</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileUpload}
          className="border rounded p-2"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload CSV/Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Item Name</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Unit</th>
              <th className="p-2 border">Expiry Date</th>
              <th className="p-2 border">Storage Location</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {editingId === item.id ? (
                  <>
                    <td className="border p-1">
                      <input
                        name="name"
                        value={item.name}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        name="category"
                        value={item.category}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        name="quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        name="unit"
                        value={item.unit}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        name="expiryDate"
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        name="storageLocation"
                        value={item.storageLocation}
                        onChange={(e) => handleInputChange(e, item.id)}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="border p-1 flex gap-2">
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => handleSaveEdit(item.id)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-400 text-white px-2 py-1 rounded"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border p-1">{item.name}</td>
                    <td className="border p-1">{item.category}</td>
                    <td className="border p-1">{item.quantity}</td>
                    <td className="border p-1">{item.unit}</td>
                    <td className="border p-1">{item.expiryDate}</td>
                    <td className="border p-1">{item.storageLocation}</td>
                    <td className="border p-1 flex gap-2">
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                        onClick={() => handleEdit(item.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="border p-1">
                <input
                  name="name"
                  value={newItem.name}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
              </td>
              <td className="border p-1">
                <input
                  name="category"
                  value={newItem.category}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.category && <span className="text-xs text-red-500">{errors.category}</span>}
              </td>
              <td className="border p-1">
                <input
                  name="quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.quantity && <span className="text-xs text-red-500">{errors.quantity}</span>}
              </td>
              <td className="border p-1">
                <input
                  name="unit"
                  value={newItem.unit}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.unit && <span className="text-xs text-red-500">{errors.unit}</span>}
              </td>
              <td className="border p-1">
                <input
                  name="expiryDate"
                  type="date"
                  value={newItem.expiryDate}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.expiryDate && <span className="text-xs text-red-500">{errors.expiryDate}</span>}
              </td>
              <td className="border p-1">
                <input
                  name="storageLocation"
                  value={newItem.storageLocation}
                  onChange={handleInputChange}
                  className="border rounded p-1 w-full"
                />
                {errors.storageLocation && <span className="text-xs text-red-500">{errors.storageLocation}</span>}
              </td>
              <td className="border p-1">
                <button
                  className="bg-green-600 text-white px-2 py-1 rounded"
                  onClick={handleAddRow}
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800"
          onClick={handleSubmit}
        >
          Save & Submit Inventory
        </button>
      </div>
    </div>
  );
}

export default InventoryManager;
