import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


interface DishInput {
  name: string;
  description?: string;
  ingredients: DishIngredientInput[];
}

interface DishIngredientInput {
  ingredient_id: number;
  quantity: number;
  unit: string;
}

export const updateDish = async (id: number, dish: DishInput) => {
  const res = await authFetch(`${BASE_URL}/dishes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dish)
  });
  if (!res.ok) throw new Error("Failed to update dish");
  return res.json();
};
