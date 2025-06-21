import React, { useEffect, useState } from "react";
import { fetchInventory } from "../api/fetchInventory";

const InventoryList = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-6 p-4 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Current Inventory</h2>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No inventory found.</p>
      ) : (
        <ul className="list-disc pl-5">
          {items.map((item, i) => (
            <li key={i}>
              {item.ingredient_name} – {item.quantity} {item.unit} ({item.category})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InventoryList;
