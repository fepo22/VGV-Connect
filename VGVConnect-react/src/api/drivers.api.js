const API_URL = "http://localhost:4000/deliveries";

export const registrarEntregaDriver = async (data) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return await res.json();
};
