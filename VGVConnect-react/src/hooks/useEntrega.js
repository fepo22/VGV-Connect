import { registrarEntregaDriver } from "../api/drivers.api";

export function useEntrega() {
  const registrarEntrega = async (data) => {
    try {
      const response = await registrarEntregaDriver(data);
      return response;
    } catch (error) {
      console.error("Error registrando entrega:", error);
      throw error;
    }
  };

  return { registrarEntrega };
}
