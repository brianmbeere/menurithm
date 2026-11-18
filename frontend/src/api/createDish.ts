import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";
import type { Dish } from "./fetchDishes";

export interface DishIngredientInput {
  ingredient_id: number;
  quantity: number;
  unit: string;
}

export interface DishInput {
  name: string;
  description?: string;
  recipe_yield?: number | null;
  ingredients: DishIngredientInput[];
}

export type DishOutput = Dish;

export const createDish = async (dish: DishInput) => {
  const response = await authFetch (`${BASE_URL}/dishes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dish),
  });

  if (!response.ok) {
    throw new Error("Failed to create dish");
  }

  return response.json();
};
