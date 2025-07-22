import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


const deleteInventory = async (ingredient_name: string) => {
  const res = await authFetch (`${BASE_URL}/inventory/${ingredient_name}`, {
    method: "DELETE"
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || "Failed to delete inventory item";
    throw new Error(message);
  }
};

export default deleteInventory;