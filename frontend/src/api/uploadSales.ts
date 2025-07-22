import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export const uploadSalesFile = async (file: File) => {
  console.log("🔄 Uploading sales CSV:", file.name);
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch (`${BASE_URL}/upload-sales`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json(); 
  console.log("📤 Sales upload response:", res.status, data);

  if (!res.ok) {
    const errorMessage = data.detail?.errors ? 
      `Upload failed: ${data.detail.errors.join(', ')}` : 
      `Failed to upload sales CSV: ${data.message || 'Unknown error'}`;
    throw new Error(errorMessage);
  }

  return data;
};

