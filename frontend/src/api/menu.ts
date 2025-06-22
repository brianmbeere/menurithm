import { BASE_URL } from "../utils";

export const getGeneratedMenu = async () => {
  const response = await fetch(`${BASE_URL}/generate-menu`);
  if (!response.ok) {
    throw new Error("Failed to fetch menu");
  }
  return response.json();
};

