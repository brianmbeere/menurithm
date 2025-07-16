import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


const uploadDishesFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE_URL}/upload-dishes`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload dishes CSV");

  const data = await res.json(); 
  console.log(data)

  return data;
};

export default uploadDishesFile;
