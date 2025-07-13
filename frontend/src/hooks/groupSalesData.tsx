import type { Sale } from "../api/fetchSales";
import { format, parseISO } from "date-fns";

// Group sales by weekday
const groupSalesByDay = (sales: Sale[]) => {
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  sales.forEach((sale) => {
    const date = parseISO(sale.timestamp);
    const weekday = format(date, "eee"); // e.g., "Mon", "Tue"
    const total = sale.quantity_sold * sale.price_per_unit;
    dayMap[weekday] += total;
  });

  return Object.entries(dayMap).map(([day, sales]) => ({ day, sales }));
};

export default groupSalesByDay;