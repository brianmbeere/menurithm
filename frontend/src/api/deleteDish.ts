const deleteDish = async (dishId: number): Promise<void> => {
  const res = await fetch(`http://localhost:8000/dishes/${dishId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete dish");
  }
};

export default deleteDish;
