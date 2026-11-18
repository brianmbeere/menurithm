import { authFetch } from "../hooks/authFetch";
import { BASE_URL } from "../utils";

export interface CroprithmProduceListing {
  id: number;
  seller_id: number;
  seller_name: string;
  seller_contact: string;
  produce_type: string;
  variety: string | null;
  quantity_available: number;
  unit: string;
  price_per_unit: number;
  location: string;
  organic: boolean;
  description: string | null;
  illustration?: { id: string; label: string; symbol: string; background: string } | null;
  harvest_date?: string | null;
  expiry_date: string | null;
}

export const fetchCroprithmProduce = async (produceType: string): Promise<CroprithmProduceListing[]> => {
  const query = new URLSearchParams();
  if (produceType.trim()) query.set("produce_type", produceType.trim());
  const response = await authFetch(
    `${BASE_URL}/api/fulfillment/produce/available${query.size ? `?${query}` : ""}`,
  );
  if (!response.ok) throw new Error("Failed to fetch available Croprithm produce");
  return response.json();
};
