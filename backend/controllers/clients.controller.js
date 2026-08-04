import { clients } from "../data/clients.mock.js";

let nextClientId = Math.max(...clients.map(c=>c.id)) + 1;
let nextAddressId = clients.reduce((acc, c) => {
  const max = c.addresses && c.addresses.length ? Math.max(...c.addresses.map(a=>a.id)) : 0;
  return Math.max(acc, max);
}, 0) + 1;

export const getClients = (req, res) => {
  const { query } = req.query;
  if (query) {
    const q = query.toLowerCase();
    const filtered = clients.filter(c => c.name.toLowerCase().includes(q));
    return res.json(filtered);
  }
  res.json(clients);
};

export const createClient = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });

  const existing = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return res.status(200).json(existing);

  const newClient = { id: nextClientId++, name, addresses: [] };
  clients.push(newClient);
  res.status(201).json(newClient);
};

export const getClientAddresses = (req, res) => {
  const { id } = req.params;
  const client = clients.find(c => c.id === Number(id));
  if (!client) return res.status(404).json({ message: "Client not found" });
  res.json(client.addresses || []);
};

export const createClientAddress = (req, res) => {
  const { id } = req.params;
  const client = clients.find(c => c.id === Number(id));
  if (!client) return res.status(404).json({ message: "Client not found" });

  const data = req.body;
  const addr = {
    id: nextAddressId++,
    label: data.label || data.street || `Address ${nextAddressId}`,
    street: data.street || "",
    city: data.city || "",
    state: data.state || "",
    postalCode: data.postalCode || "",
    country: data.country || "",
    latitude: data.latitude || null,
    longitude: data.longitude || null,
  };

  client.addresses = client.addresses || [];
  client.addresses.push(addr);
  res.status(201).json(addr);
};

