import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { authApi } from "../api/authApi";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!newPassword) {
      nextErrors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Mật khẩu tối thiểu phải chứa 8 ký tự";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Mật khẩu không trùng khớp";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    try {
      await authApi.resetPassword(token, newPassword);
      // replace: bấm Back sẽ không quay lại trang có link đã dùng
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setServerError(err.message);
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="auth-page">
        <section className="verify-card">
          <h1 className="login-heading">Link không hợp lệ</h1>
          <p className="login-description verify-text">
            Link đặt lại mật khẩu bị thiếu hoặc sai. Vui lòng yêu cầu link mới.
          </p>
          <Link to="/forgot-password" className="login-submit-button">
            Yêu cầu link mới
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="verify-card">
        <div className="verify-icon" aria-hidden="true">
          <LockKeyhole size={28} />
        </div>

        <h1 className="login-heading">Đặt lại mật khẩu</h1>
        <p className="login-description verify-text">
          Nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 8 ký tự).
        </p>

        {serverError && (
          <div className="login-server-error verify-form" role="alert">
            <p className="login-server-error-text">{serverError}</p>
            <Link to="/forgot-password" className="login-server-error-action">
              Link hết hạn? Yêu cầu link mới →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="verify-form" noValidate>
          <div className="login-field">
            <label htmlFor="new-password" className="login-label">Mật khẩu mới</label>
            <div className="login-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="login-input login-input-password"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={errors.newPassword ? "new-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                className="login-password-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p id="new-password-error" className="login-field-error">{errors.newPassword}</p>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="confirm-password" className="login-label">Nhập lại mật khẩu mới</label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="login-input"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="login-field-error">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button type="submit" disabled={loading} className="login-submit-button">
            {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <Link to="/login" className="login-register-link verify-back-link">
          ← Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}