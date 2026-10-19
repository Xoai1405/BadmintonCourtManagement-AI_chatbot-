import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import logoImg from "../assets/Logo.png";


const roleLabel = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
};

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const name = user?.fullName || "Người dùng";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const signOut = () => {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img
            src={logoImg}
            alt="SmashFlow"
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-extrabold text-slate-800">
            Smash<span className="text-emerald-500">Flow</span>
          </span>
        </Link>
        {isAuthenticated && (
          <div className="hidden h-full items-center gap-8 md:flex">
            <MenuLink to="/" label="Sân" end />
            <MenuLink to="/recurring-bookings" label="Lịch cố định" />
            <MenuLink to="/my-bookings" label="Booking của tôi" />
          </div>
        )}
        {isAuthenticated ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Avatar initials={initials} />
              <span className="hidden sm:inline">{name}</span>
              <ChevronDown size={17} />
            </button>
            {open && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                  <Avatar initials={initials} large />
                  <div>
                    <p className="font-bold text-slate-800">{name}</p>
                    <p className="text-xs text-slate-500">
                      {roleLabel[user?.role] || "Khách hàng"}
                    </p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserRound size={19} />
                  Thông tin cá nhân
                </Link>
                <Link
                  to="/profile#change-password"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LockKeyhole size={19} />
                  Đổi mật khẩu
                </Link>
                <div className="border-t border-slate-100" />
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-rose-500 hover:bg-rose-50"
                >
                  <LogOut size={19} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
      
    </nav>
  );
}
function MenuLink({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex h-full items-center border-b-2 px-1 text-base ${isActive ? "border-emerald-500 font-semibold text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900"}`
      }
    >
      {label}
    </NavLink>
  );
}
function Avatar({ initials, large = false }) {
  return (
    <span
      className={`grid place-items-center rounded-full bg-slate-800 font-bold text-white ${large ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs"}`}
    >
      {initials || "SF"}
    </span>
  );
}
