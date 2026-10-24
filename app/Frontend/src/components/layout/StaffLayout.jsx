import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import logo from "../../assets/Logo.png";
import "./StaffLayout.css";

export default function StaffLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const name = user?.fullName || "Đoàn Thị B";
  const initials = name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("");

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="staff-layout">
      <header className="staff-header">
        <Link to="/staff/bookings" className="staff-brand" aria-label="SmashFlow — Panel Nhân Viên">
          <span className="staff-brand-logo"><img src={logo} alt="" /></span>
          <strong>Panel Nhân Viên</strong>
        </Link>
        <nav className="staff-navigation" aria-label="Menu nhân viên">
          <NavLink to="/staff/create-booking" className="staff-nav-link">Tạo booking</NavLink>
          <NavLink to="/staff/bookings" className="staff-nav-link">Tra cứu booking</NavLink>
        </nav>
        <div className="staff-account">
          <span className="staff-avatar" aria-hidden="true">{initials}</span>
          <span className="staff-account-name">{name}</span>
        </div>
      </header>
      <main className="staff-main"><Outlet /></main>
    </div>
  );
}
