import { BASE_URL } from "../utils";

export interface DishIngredient {
  ingredient_name: string;
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
  const res = await fetch(`${BASE_URL}/dishes`);
  if (!res.ok) throw new Error("Failed to fetch dishes");
  return res.json();
};
