export default function DeliveryStatusBadge({ status }) {
  const colors = {
    pending: "#f0ad4e",
    in_route: "#0275d8",
    delivered: "#5cb85c",
    failed: "#d9534f",
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "20px",
        background: colors[status] || "#999",
        color: "#fff",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}
