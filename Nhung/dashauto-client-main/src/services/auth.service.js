import api from "./api";

export const login = async (username, password) => {
  const { data } = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
};

export const register = async (username, password, role) => {
  const { data } = await api.post("/auth/register", { username, password, role });
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
