import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


export interface SaleInput {
  dish_name: string;
  timestamp: string;
  quantity_sold: number;
  price_per_unit: number;
}

export const updateSale = async (id: number, sale: SaleInput) => {
  const res = await authFetch(`${BASE_URL}/sales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sale)
  });
  if (!res.ok) throw new Error("Failed to update sale");
  return res.json();
};


