import { useDeliveries } from "../../hooks/useDeliveries";
import DeliveryList from "../../components/deliveries/DeliveryList";
import { useState } from "react";

export default function DeliveriesPage() {
  const { deliveries, loading, uploadPhoto, markAsDelivered } = useDeliveries();
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  const handleDelivery = async (delivery) => {
    try {
      setLoadingDelivery(true);

      // Selección de foto
      const file = await new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.onchange = (e) => {
          if (e.target.files[0]) resolve(e.target.files[0]);
          else reject(new Error("No se seleccionó foto"));
        };
        input.click();
      });

      const photoUrl = await uploadPhoto(file);

      // Geolocalización
      const location = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          (err) => reject(err)
        )
      );

      await markAsDelivered(delivery.id, photoUrl, location);
      alert("Entrega registrada ✅");
    } catch (error) {
      console.error(error);
      alert("Error al registrar entrega ❌");
    } finally {
      setLoadingDelivery(false);
    }
  };

  if (loading) return <p>Cargando entregas...</p>;

  return (
    <div>
      <h1>Entregas del día</h1>
      {loadingDelivery && <p>Procesando entrega...</p>}
      <DeliveryList deliveries={deliveries} onSelect={handleDelivery} />
    </div>
  );
}
