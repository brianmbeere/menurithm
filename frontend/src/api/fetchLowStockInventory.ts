import { authFetch } from "../hooks/authFetch";
import { BASE_URL } from "../utils";
import { type InventoryItem } from "./updateInventory";

export const fetchLowStockInventory = async (): Promise<InventoryItem[]> => {
  const response = await authFetch(`${BASE_URL}/inventory/low-stock`);
  if (!response.ok) throw new Error("Failed to fetch low-stock inventory");
  return response.json();
};
