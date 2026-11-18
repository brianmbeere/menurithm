import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export interface InventoryItem {
  id: number;
  ingredient_name: string;
  quantity: string;
  reorder_point: string;
  unit: string;
  category: string;
  expiry_date: string;
  storage_location: string;
  adjustment_reason?: string;
}


export const updateInventory = async (item: InventoryItem, originalName = item.ingredient_name) => {
  const res = await authFetch(`${BASE_URL}/inventory/${encodeURIComponent(originalName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "Failed to update inventory");
  }
  return res.json();
};
