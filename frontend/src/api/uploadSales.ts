import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export const uploadSalesFile = async (file: File) => {
  console.log("Uploading sales CSV:", file);
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch (`${BASE_URL}/upload-sales`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload sales CSV");
  }

  return res.json();
};

