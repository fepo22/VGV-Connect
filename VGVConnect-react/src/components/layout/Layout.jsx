import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { ToastProvider } from "../ui/ToastContext";

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <ToastProvider>
          <main className="page-content"><Outlet /></main>
        </ToastProvider>
      </div>
    </div>
  );
}
