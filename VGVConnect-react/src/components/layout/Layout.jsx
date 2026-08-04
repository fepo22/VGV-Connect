import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { ToastProvider } from "../ui/ToastContext";

export default function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          background: "var(--bg)",
          minHeight: "100vh",
        }}
      >
        <Navbar />

        <ToastProvider>
          <div style={{ padding: "24px 22px", maxWidth: "1440px", margin: "0 auto" }}>
            <Outlet />
          </div>
        </ToastProvider>
      </div>
    </div>
  );
}
