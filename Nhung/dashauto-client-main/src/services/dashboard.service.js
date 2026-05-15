import api from "./api";

export const getStats = async (params = {}) => {
  const { data } = await api.get("/dashboard/stats", { params });
  return data;
};

export const getRevenue = async (params = {}) => {
  const { data } = await api.get("/dashboard/revenue", { params });
  return data;
};

export const getTopProducts = async (params = {}) => {
  const { data } = await api.get("/dashboard/top-products", { params });
  return data;
};

export const getKpi = async (params = {}) => {
  const { data } = await api.get("/dashboard/kpi", { params });
  return data;
};
