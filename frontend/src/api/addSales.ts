export interface SaleInput {
  date: string;
  dish_name: string;
  quantity_sold: number;
  price_per_unit: number;
}

export const addSale = async (sale: SaleInput) => {
  const res = await fetch("http://localhost:8000/sales", {
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
