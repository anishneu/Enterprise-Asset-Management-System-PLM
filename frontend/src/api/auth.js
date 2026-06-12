const BASE_URL = "http://127.0.0.1:8000/api/auth";

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

