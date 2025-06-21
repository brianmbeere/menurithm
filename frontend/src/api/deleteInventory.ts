const deleteInventory = async (ingredient_name: string) => {
  const res = await fetch(`http://localhost:8000/inventory/${ingredient_name}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete inventory");
};

export default deleteInventory;