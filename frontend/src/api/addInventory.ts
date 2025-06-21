import { type InventoryItem } from "./updateInventory";

const addInventory = async (item: InventoryItem) => {
  const res = await fetch("http://localhost:8000/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!res.ok) {
    throw new Error("Failed to add inventory item");
  }

  return res.json();
};

export default addInventory;
