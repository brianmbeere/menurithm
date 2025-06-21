interface DishInput {
  name: string;
  description?: string;
  ingredients: DishIngredientInput[];
}

interface DishIngredientInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export const updateDish = async (id: number, dish: DishInput) => {
  const res = await fetch(`http://localhost:8000/dishes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dish)
  });
  if (!res.ok) throw new Error("Failed to update dish");
  return res.json();
};
