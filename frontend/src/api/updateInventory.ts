export interface InventoryItem {
  ingredient_name: string;
  quantity: string;
  unit: string;
  category: string;
  expiry_date: string;
  storage_location: string;
}


export const updateInventory = async (item: InventoryItem) => {
  const res = await fetch(`http://localhost:8000/inventory/${item.ingredient_name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error("Failed to update inventory");
  return res.json();
};
