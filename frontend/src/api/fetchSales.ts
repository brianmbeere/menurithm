export const fetchSales = async () => {
  const response = await fetch("http://localhost:8000/sales");
  if (!response.ok) {
    throw new Error("Failed to fetch sales records");
  }
  return response.json();
};
