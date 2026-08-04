import http from "./http";

export const getClients = async (query) => {
  const url = query ? `/clients?query=${encodeURIComponent(query)}` : "/clients";
  const response = await http.get(url);
  return response.data;
};

export const getClientAddresses = async (clientId) => {
  const response = await http.get(`/clients/${clientId}/addresses`);
  return response.data;
};

export const createClientAddress = async (clientId, address) => {
  const response = await http.post(`/clients/${clientId}/addresses`, address);
  return response.data;
};

export const createClient = async (data) => {
  const response = await http.post(`/clients`, data);
  return response.data;
};
