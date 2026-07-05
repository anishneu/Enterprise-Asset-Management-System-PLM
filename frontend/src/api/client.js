import axios from "axios";
import keycloak from "../keycloak";
import { logoutFromApp } from "../auth/initKeycloak";

const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
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
