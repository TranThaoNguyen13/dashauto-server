import api from "./api";

export const listReports = async (params = {}) => {
  const { data } = await api.get("/reports", { params });
  return data;
};
