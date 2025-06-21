export const uploadSalesData = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:8000/upload-sales", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload sales data");
  }

  return response.json();
};
