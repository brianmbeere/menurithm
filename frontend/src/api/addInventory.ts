import { type InventoryItem } from "./updateInventory";
import { BASE_URL } from "../utils";


const addInventory = async (item: InventoryItem) => {
  const res = await fetch(`${BASE_URL}/inventory`, {
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
