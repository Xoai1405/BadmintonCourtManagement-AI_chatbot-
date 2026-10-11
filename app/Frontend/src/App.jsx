
import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
function App() {
    return (

    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route
        path="/register"
        element={<RegisterPage />}
      />
     
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>

    );
}

export default App;
