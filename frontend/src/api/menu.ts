import { BASE_URL } from "../utils";


export const getGeneratedMenuSmart = async () => {
  const response = await fetch(`${BASE_URL}/generate-menu-smart`);
  if (!response.ok) {
    throw new Error("Failed to fetch smart menu");
  }
  return response.json();
};
