import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export interface DishIngredient {
  ingredient_id: number;
  ingredient_name?: string; // for display
  quantity: number;
  unit: string;
}

export interface Dish {
  id: number;
  name: string;
  description?: string;
  ingredients: DishIngredient[];
}

export const fetchDishes = async (): Promise<Dish[]> => {
  const res = await authFetch(`${BASE_URL}/dishes`);
  if (!res.ok) throw new Error("Failed to fetch dishes");

  const data = await res.json(); 

  return data;
};
