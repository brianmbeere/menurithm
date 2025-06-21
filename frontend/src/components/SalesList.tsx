import React, { useEffect, useState } from "react";
import { fetchSales } from "../api/fetchSales";

const SalesList = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-6 p-4 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Sales History</h2>
      {loading ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <p>No sales records found.</p>
      ) : (
        <ul className="list-disc pl-5">
          {records.map((record, i) => (
            <li key={i}>
              {record.date}: {record.dish_name} – {record.quantity_sold} sold @ ${record.price_per_unit}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SalesList;
