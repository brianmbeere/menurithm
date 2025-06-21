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
  const res = await fetch("http://localhost:8000/dishes");
  if (!res.ok) throw new Error("Failed to fetch dishes");
  return res.json();
};
