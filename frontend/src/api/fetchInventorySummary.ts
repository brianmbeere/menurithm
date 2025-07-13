import { BASE_URL } from "../utils";

 const fetchInventorySummary = async () => {
  const response = await fetch(`${BASE_URL}/inventory/summary`);
  if (!response.ok) {
    throw new Error("Failed to fetch inventory summary");
  }
  return response.json();
};

export default fetchInventorySummary;