import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

 const fetchInventory = async () => {
  const response = await authFetch(`${BASE_URL}/inventory`);
  if (!response.ok) {
    throw new Error("Failed to fetch inventory");
  }
  return response.json();
};

export default fetchInventory;

