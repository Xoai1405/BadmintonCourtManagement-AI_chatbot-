
import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-7xl font-extrabold text-rose-500">
        403
      </h1>

      <h2 className="mt-4 text-2xl font-bold text-slate-800">
        Không có quyền truy cập
      </h2>

      <p className="mt-2 max-w-md text-slate-500">
        Tài khoản của bạn không có quyền truy cập khu vực này.
      </p>

      <Link
        to="/"
        className="mt-6 rounded-lg bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700"
      >
        Quay về trang chủ
      </Link>
    </div>
  );
}
