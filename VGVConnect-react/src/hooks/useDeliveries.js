import { useState, useEffect, useCallback } from "react";
import {
  getDeliveries,
  updateDeliveryStatus,
  uploadDeliveryPhoto,
  createDeliveryReport,
} from "../api/deliveries.api";

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    const { data } = await getDeliveries();
    setDeliveries(data);
    setLoading(false);
  }, []);

  const uploadPhoto = async (file) => {
    const formData = new FormData();
    formData.append("photo", file);

    const { data } = await uploadDeliveryPhoto(formData);
    return data.url;
  };

  const markAsDelivered = async (id, photoUrl, location) => {
    await updateDeliveryStatus(id, "delivered");

    await createDeliveryReport({
      deliveryId: id,
      photoUrl,
      location,
      timestamp: new Date().toISOString(),
    });

    loadDeliveries();
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadDeliveries();
    };

    fetchData();
  }, [loadDeliveries]);

  return {
    deliveries,
    loading,
    uploadPhoto,
    markAsDelivered,
  };
}
