import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";


const uploadInventoryFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE_URL}/upload-inventory`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload inventory CSV");
  }

  return res.json();
};

export default uploadInventoryFile;
