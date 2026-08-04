import { deliveries } from "../data/deliveries.mock.js";

export const getDeliveries = (req, res) => {
  res.json(deliveries);
};

export const updateDeliveryStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const delivery = deliveries.find((d) => d.id === Number(id));

  if (!delivery) {
    return res.status(404).json({ message: "Delivery not found" });
  }

  delivery.estado = status;

  res.json({ message: "Status updated", delivery });
};
