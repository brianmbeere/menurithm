import React, { useEffect, useState } from "react";
import { getGeneratedMenu } from "../api/menu";

const Home = () => {
  const [menu, setMenu] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getGeneratedMenu()
      .then(data => setMenu(data.dishes))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Today's Menu</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="list-disc pl-5">
          {menu.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Home;
