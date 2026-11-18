import { authFetch } from "../hooks/authFetch";
import { BASE_URL } from "../utils";

export interface InventoryMovement {
  id: number;
  sale_id: number | null;
  movement_type: string;
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  unit: string;
  reason: string;
  created_at: string;
}

export const fetchInventoryMovements = async (ingredientName: string): Promise<InventoryMovement[]> => {
  const response = await authFetch(
    `${BASE_URL}/inventory/${encodeURIComponent(ingredientName)}/movements`,
  );
  if (!response.ok) throw new Error("Failed to fetch inventory history");
  return response.json();
};
