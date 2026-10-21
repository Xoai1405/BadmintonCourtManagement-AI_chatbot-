import { LockKeyhole, UserRound } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-800">Hồ sơ của tôi</h1>
        <p className="mt-1 text-slate-500">
          Cập nhật thông tin cá nhân và mật khẩu
        </p>
        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <Card title="Thông tin cá nhân" icon={<UserRound size={18} />}>
            <Field label="Họ và tên" value={user?.fullName} />
            <Field label="Số điện thoại" value={user?.phoneNumber} />
            <Field label="Email" value={user?.email} />
            <button className="mt-4 w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white">
              Lưu thông tin
            </button>
          </Card>
          <Card
            title="Đổi mật khẩu"
            icon={<LockKeyhole size={18} />}
            id="change-password"
          >
            <Field label="Mật khẩu hiện tại" value="********" type="password" />
            <Field label="Mật khẩu mới" value="********" type="password" />
            <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-slate-500">
              Mật khẩu phải có ít nhất 6 ký tự.
            </p>
            <Field
              label="Xác nhận mật khẩu mới"
              value="********"
              type="password"
            />
            <button className="mt-4 w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white">
              Đổi mật khẩu
            </button>
          </Card>
        </div>
      </main>
    </div>
  );
}
function Card({ title, icon, children, id }) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800">
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-500">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({ label, value = "", type = "text" }) {
  return (
    <label className="mt-4 block text-sm text-slate-600">
      {label}
      <input
        type={type}
        defaultValue={value}
        className="mt-1 w-full rounded-md border border-slate-400 px-3 py-2 text-slate-700 outline-none focus:border-emerald-500"
      />
    </label>
  );
}
