import { vehicles } from "../data/vehicles.mock.js";
export const getVehicles = (req, res) => {
  res.json(vehicles);
};
