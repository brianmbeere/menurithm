import { BASE_URL } from "../utils";


export interface IngredientInput {
  ingredient_name: string;
  quantity: string;
  unit: string;
  category: string;
  expiry_date: string;
  storage_location: string;
}

export const addIngredient = async (ingredient: IngredientInput) => {
  const res = await fetch(`${BASE_URL}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ingredient),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to add ingredient");
  }

  return res.json();
};
