import DeliveryCard from "./DeliveryCard";

export default function DeliveryList({ deliveries, onSelect }) {
  if (deliveries.length === 0)
    return <p>No hay entregas asignadas.</p>;

  return (
    <div>
      {deliveries.map((delivery) => (
        <DeliveryCard
          key={delivery.id}
          delivery={delivery}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
