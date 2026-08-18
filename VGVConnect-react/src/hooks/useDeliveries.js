import { useState, useEffect, useCallback } from "react";
import { getDeliveries } from "../api/deliveries.api";

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDeliveries();
      setDeliveries(data);
    } catch {
      setDeliveries([]);
      setError("No se pudieron cargar las entregas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadDeliveries();
    };

    fetchData();
  }, [loadDeliveries]);

  return {
    deliveries,
    loading,
    error,
  };
}
