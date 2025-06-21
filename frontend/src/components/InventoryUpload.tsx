import React, { useState } from "react";

const InventoryUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload-inventory", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setUploadedData(result.items);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Upload Inventory CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Upload
      </button>

      {uploadedData && (
        <div className="mt-4">
          <h3 className="font-semibold">Parsed Inventory:</h3>
          <ul className="list-disc pl-5">
            {uploadedData.map((item, i) => (
              <li key={i}>{JSON.stringify(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default InventoryUpload;
