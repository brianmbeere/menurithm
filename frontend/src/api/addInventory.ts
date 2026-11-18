import { type InventoryItem } from "./updateInventory";
import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


const addInventory = async (item: Omit<InventoryItem, "id">) => {
  const res = await authFetch (`${BASE_URL}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "Failed to add inventory item");
  }

  return res.json();
};

export default addInventory;
