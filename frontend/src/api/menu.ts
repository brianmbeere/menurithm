import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


export const getGeneratedMenuSmart = async () => {
  const response = await authFetch (`${BASE_URL}/generate-menu-smart`);
  if (!response.ok) {
    throw new Error("Failed to fetch smart menu");
  }
  return response.json();
};
