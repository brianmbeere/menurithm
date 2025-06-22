import { BASE_URL } from "../utils";


const deleteInventory = async (ingredient_name: string) => {
  const res = await fetch(`${BASE_URL}/inventory/${ingredient_name}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete inventory");
};

export default deleteInventory;