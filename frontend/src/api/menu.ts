export const getGeneratedMenu = async () => {
  const response = await fetch("http://localhost:8000/generate-menu");
  
  if (!response.ok) {
    throw new Error("Failed to fetch menu");
  }
  return response.json();
};

