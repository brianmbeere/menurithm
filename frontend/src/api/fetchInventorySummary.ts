import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

 const fetchInventorySummary = async () => {
  const response = await authFetch (`${BASE_URL}/inventory/summary`);
  if (!response.ok) {
    throw new Error("Failed to fetch inventory summary");
  }
  return response.json();
};

export default fetchInventorySummary;