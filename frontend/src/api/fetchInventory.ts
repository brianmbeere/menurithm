
const fetchInventory = async () => {
  const response = await fetch("http://localhost:8000/inventory");
  if (!response.ok) {
    throw new Error("Failed to fetch inventory");
  }
  return response.json();
};

export default fetchInventory;