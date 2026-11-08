import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { authApi } from "../api/authApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFieldError("Vui lòng nhập email");
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setFieldError("Email không hợp lệ");
      return;
    }

    setFieldError("");
    setMessage(null);
    setSending(true);
    try {
      const data = await authApi.forgotPassword(normalizedEmail);
      setMessage({ type: "success", text: data.message });
      setCooldown(60);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  };

  const buttonLabel = sending
    ? "Đang gửi..."
    : cooldown > 0
      ? `Gửi lại sau ${cooldown}s`
      : message?.type === "success"
        ? "Gửi lại link"
        : "Gửi link đặt lại mật khẩu";

  return (
    <main className="auth-page">
      <section className="verify-card">
        <div className="verify-icon" aria-hidden="true">
          <KeyRound size={28} />
        </div>

        <h1 className="login-heading">Quên mật khẩu</h1>
        <p className="login-description verify-text">
          Nhập email đã đăng ký. Chúng tôi sẽ gửi cho bạn link để đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="verify-form" noValidate>
          <div className="login-field">
            <label htmlFor="forgot-email" className="login-label">Email</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError("");
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "forgot-email-error" : undefined}
            />
            {fieldError && (
              <p id="forgot-email-error" className="login-field-error">{fieldError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={sending || cooldown > 0}
            className="login-submit-button"
          >
            {buttonLabel}
          </button>
        </form>

        {message && (
          <p className={`verify-message verify-message--${message.type}`} role="status">
            {message.text}
          </p>
        )}

        <p className="verify-note">
          Không nhận được email? Hãy kiểm tra mục Spam.
          <br />
          Link chỉ có hiệu lực trong 30 phút.
        </p>

        <Link to="/login" className="login-register-link verify-back-link">
          ← Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}