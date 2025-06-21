export const deleteIngredient = async (ingredientName: string): Promise<void> => {
  const res = await fetch(`http://localhost:8000/inventory/${ingredientName}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete ingredient");
  }
};
