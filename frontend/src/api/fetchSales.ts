import { BASE_URL } from "../utils";

export interface Sale {
  id: number;
  timestamp: string;
  dish: {
    id: number;
    name: string;
  };
  quantity_sold: number;
  price_per_unit: number;
}

export const fetchSales = async (): Promise<Sale[]> => {
  const res = await fetch(`${BASE_URL}/sales`);
  if (!res.ok) throw new Error("Failed to fetch sales");
  return res.json();
};
