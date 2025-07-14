import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

const deleteDish = async (dishId: number): Promise<void> => {
  const res = await authFetch (`${BASE_URL}/dishes/${dishId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete dish");
  }
};

export default deleteDish;
