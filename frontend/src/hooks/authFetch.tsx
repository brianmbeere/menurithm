import { getAuth } from "firebase/auth";

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
