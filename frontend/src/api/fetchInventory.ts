import { BASE_URL } from "../utils";

const fetchInventory = async () => {
  const response = await fetch(`${BASE_URL}/inventory`);
  if (!response.ok) {
    throw new Error("Failed to fetch inventory");
  }
  return response.json();
};

export default fetchInventory;