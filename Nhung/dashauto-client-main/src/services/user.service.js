import api from "./api";

export const listUsers = async (params = {}) => {
  const { data } = await api.get("/users", { params });
  return data;
};

export const getUserSummary = async () => {
  const { data } = await api.get("/users/summary");
  return data;
};

export const createUser = async (body) => {
  const { data } = await api.post("/users", body);
  return data;
};

export const updateUser = async (id, body) => {
  const { data } = await api.patch(`/users/${id}`, body);
  return data;
};

export const resetUserPassword = async (id, password) => {
  const { data } = await api.patch(`/users/${id}/password`, { password });
  return data;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data } = await api.patch("/users/me/password", {
    currentPassword,
    newPassword,
  });
  return data;
};
