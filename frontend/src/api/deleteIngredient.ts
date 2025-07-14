import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export const deleteIngredient = async (ingredientName: string): Promise<void> => {
  const res = await authFetch(`${BASE_URL}/inventory/${ingredientName}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete ingredient");
  }
};
