export interface Sale {
  id: number;
  date: string;
  dish_name: string;
  quantity_sold: number;
  price_per_unit: number;
}

export const fetchSales = async (): Promise<Sale[]> => {
  const res = await fetch("http://localhost:8000/sales");
  if (!res.ok) throw new Error("Failed to fetch sales");
  return res.json();
};
