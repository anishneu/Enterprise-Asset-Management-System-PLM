import { API_BASE_URL } from "../config";

const BASE_URL = `${API_BASE_URL}/auth`;

async function request(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.detail || result.message || "Request failed");
  }

  return result;
}

export const loginUser = (data) =>
  request(`${BASE_URL}/login`, data);

export const registerUser = (data) =>
  request(`${BASE_URL}/register`, data);
