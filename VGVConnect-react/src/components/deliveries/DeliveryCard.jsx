import DeliveryStatusBadge from "./DeliveryStatusBadge";

export default function DeliveryCard({ delivery, onSelect }) {
  return (
    <div
      onClick={() => onSelect(delivery)}
      style={{
        padding: "16px",
        marginBottom: "12px",
        borderRadius: "10px",
        background: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        cursor: "pointer",
      }}
    >
      <h3 style={{ margin: 0 }}>{delivery.client}</h3>
      <p style={{ margin: "4px 0" }}>{delivery.address}</p>

      <span>
        <DeliveryStatusBadge status={delivery.status} />
      </span>
    </div>
  );
}
