import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";
import type { DishInput, DishOutput } from "./createDish";

export const updateDish = async (id: number, dish: DishInput): Promise<DishOutput> => {
  const res = await authFetch(`${BASE_URL}/dishes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dish)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "Failed to update dish");
  }
  return res.json();
};
