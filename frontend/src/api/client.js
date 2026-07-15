import axios from "axios";
import keycloak from "../keycloak";
import { logoutFromApp } from "../auth/initKeycloak";
import { API_BASE_URL } from "../config";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    await keycloak.updateToken(30);
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  } catch (err) {
    console.error("Token refresh failed:", err);
    logoutFromApp();
    return Promise.reject(err);
  }

  return config;
});

export default apiClient;
