import { authFetch } from "../hooks/authFetch";
import { BASE_URL } from "../utils";

export async function accountRequest<T>(path: string, method = "GET", data?: object): Promise<T> {
  const response = await authFetch(`${BASE_URL}/api/${path}`, {
    method,
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `Request failed (${response.status}).`);
  }
  return response.json();
}

export type RestaurantProfile = {
  full_name: string;
  restaurant_name: string;
  street: string;
  suite: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
};

export const loadRestaurantProfile = () => accountRequest<RestaurantProfile>("restaurant-profile");

export function formatDeliveryAddress(profile: RestaurantProfile): string {
  if (!profile.street) return "";
  return [[profile.street, profile.suite].filter(Boolean).join(", "),
    profile.city, `${profile.region} ${profile.postal_code}`.trim(), profile.country].filter(Boolean).join(", ");
}
