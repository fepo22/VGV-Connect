export default function Navbar() {
  return (
    <div
      style={{
        width: "100%",
        height: "60px",
        background: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 20px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <span style={{ fontWeight: "bold" }}>Usuario</span>
    </div>
  );
}
