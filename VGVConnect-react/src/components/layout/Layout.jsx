import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          marginLeft: "240px",
          background: "#f5f6fa",
          minHeight: "100vh",
        }}
      >
        <Navbar />

        <div style={{ padding: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
