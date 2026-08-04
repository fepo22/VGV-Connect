import http from "./http";

export const getOrders = async () => {
  const response = await http.get("/orders");
  return response.data;
};

export const createOrder = async (data) => {
  const response = await http.post("/orders", data);
  return response.data;
};

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  const response = await http.put(`/orders/${orderId}/status`, { status, ...extra });
  return response.data;
};

export const getOrdersByDriver = async (driverId, status) => {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await http.get(`/drivers/${driverId}/orders${q}`);
  return response.data;
};
