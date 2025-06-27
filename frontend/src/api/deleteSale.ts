import { BASE_URL } from "../utils";

export const deleteSale = async (saleId: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/sales/${saleId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete sale");
  }
};

