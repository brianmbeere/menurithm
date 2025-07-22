import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


const uploadDishesFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE_URL}/upload-dishes`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json(); 
  console.log('Upload response:', res.status, data);

  if (!res.ok) {
    const errorMessage = data.detail?.errors ? 
      `Upload failed: ${data.detail.errors.join(', ')}` : 
      `Failed to upload dishes CSV: ${data.message || 'Unknown error'}`;
    throw new Error(errorMessage);
  }

  return data;
};

export default uploadDishesFile;
