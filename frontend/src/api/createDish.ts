export interface DishIngredientInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export interface DishInput {
  name: string;
  description?: string;
  ingredients: DishIngredientInput[];
}

export const createDish = async (dish: DishInput) => {
  const response = await fetch("http://localhost:8000/dishes", {
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
