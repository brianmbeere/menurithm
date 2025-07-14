import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export const deleteSale = async (saleId: number): Promise<void> => {
  const res = await authFetch(`${BASE_URL}/sales/${saleId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete sale");
  }
};

