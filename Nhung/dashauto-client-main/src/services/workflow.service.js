import api from "./api";

export const listWorkflowLogs = async (params = {}) => {
  const { data } = await api.get("/workflows", { params });
  return data;
};

export const getWorkflowSummary = async () => {
  const { data } = await api.get("/workflows/summary");
  return data;
};
