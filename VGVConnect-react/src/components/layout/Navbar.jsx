export default function Navbar() {
  return (
    <div
      style={{
        width: "100%",
        height: "64px",
        background: "#f8fafc",
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: 700, color: "#111827" }}>Bienvenido</span>
      </div>
      <div
        style={{
          background: "#ffffff",
          padding: "8px 14px",
          borderRadius: "999px",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          color: "#111827",
          fontWeight: 600,
        }}
      >
        Usuario
      </div>
    </div>
  );
}
