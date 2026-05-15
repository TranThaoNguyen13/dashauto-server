import api from "./api";

export const listAlerts = async (params = {}) => {
  const { data } = await api.get("/alerts", { params });
  return data;
};

export const resolveAlert = async (id) => {
  const { data } = await api.patch(`/alerts/${id}/resolve`);
  return data;
};
