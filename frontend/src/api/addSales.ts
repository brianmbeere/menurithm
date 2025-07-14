import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export interface SaleInput {
  timestamp: string; // ISO string (e.g. 2025-06-27T12:00:00Z)
  dish_name: string;
  quantity_sold: number;
  price_per_unit: number;
}

export const addSale = async (sale: SaleInput) => {
  console.log("Adding sale:", sale);
  const res = await authFetch(`${BASE_URL}/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sale),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to add sale");
  }

  return res.json();
};
