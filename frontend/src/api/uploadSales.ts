import { BASE_URL } from "../utils";

export const uploadSalesFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload-sales`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload sales CSV");
  }

  return res.json();
};

