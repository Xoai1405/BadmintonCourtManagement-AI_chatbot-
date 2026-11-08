import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { authApi } from "../api/authApi";

export default function CheckEmailPage() {
  const location = useLocation();
  const justRegistered = location.state?.justRegistered === true;

  const [identifier, setIdentifier] = useState(location.state?.email ?? "");
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(justRegistered ? 60 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập email hoặc số điện thoại" });
      return;
    }

    setSending(true);
    try {
      const data = await authApi.resendVerification(identifier.trim());
      setMessage({ type: "success", text: data.message });
      setCooldown(60);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="verify-card">
        <div className="verify-icon" aria-hidden="true">
          <MailCheck size={28} />
        </div>

        <h1 className="login-heading">Kiểm tra email của bạn</h1>

        {justRegistered ? (
          <p className="login-description verify-text">
            Chúng tôi đã gửi link xác thực tới{" "}
            <strong className="verify-email">{identifier}</strong>.
            Link có hiệu lực trong 24 giờ.
          </p>
        ) : (
          <p className="login-description verify-text">
            Nhập email hoặc số điện thoại đã đăng ký để nhận lại link xác thực.
          </p>
        )}

        <form onSubmit={handleResend} className="verify-form" noValidate>
          <div className="login-field">
            <label htmlFor="identifier" className="login-label">
              Email hoặc số điện thoại
            </label>
            <input
              id="identifier"
              className="login-input"
              placeholder="you@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={sending || cooldown > 0}
            className="login-submit-button"
          >
            {sending
              ? "Đang gửi..."
              : cooldown > 0
                ? `Gửi lại sau ${cooldown}s`
                : "Gửi lại email xác thực"}
          </button>
        </form>

        {message && (
          <p
            className={`verify-message verify-message--${message.type}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <p className="verify-note">
          Không nhận được email? Hãy kiểm tra mục Spam.
          <br />
          Tài khoản chưa xác thực sẽ tự động bị xóa sau 7 ngày.
        </p>

        <Link to="/login" className="login-register-link verify-back-link">
          ← Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}