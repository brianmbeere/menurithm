import React, { useState } from "react";
import { uploadSalesData } from "../api/uploadSales";

const SalesUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    try {
      const result = await uploadSalesData(file);
      setRecords(result.records);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-2">Upload Sales History CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Upload
      </button>

      {records && (
        <div className="mt-4">
          <h3 className="font-semibold">Parsed Sales Records:</h3>
          <ul className="list-disc pl-5">
            {records.map((item, i) => (
              <li key={i}>{JSON.stringify(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default SalesUpload;
