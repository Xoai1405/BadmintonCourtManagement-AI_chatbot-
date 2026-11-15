
import { Outlet } from "react-router-dom";
import Navbar from "../Navbar";
import ChatbotButton from "../ChatbotButton";

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <Outlet />
      </main>

      {/* <ChatbotButton /> */}
    </div>
  );
}
