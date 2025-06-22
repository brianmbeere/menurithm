import { BASE_URL } from "../utils";

export const deleteIngredient = async (ingredientName: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/inventory/${ingredientName}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete ingredient");
  }
};
