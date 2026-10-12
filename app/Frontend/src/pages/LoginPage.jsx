import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import LoginAndRegisterImage from "../assets/LoginAndRegisterImage.jpg";
import SmashFlowLogo from "../assets/Logo.png";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [emailOrPhoneNumber, setEmailOrPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailOrPhoneNumberRef = useRef(null);
  const passwordRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Xử lý thay đổi email hoặc số điện thoại
  const handleEmailOrPhoneNumberChange = (e) => {
    setEmailOrPhoneNumber(e.target.value);

    if (errors.emailOrPhoneNumber) {
      setErrors((prev) => ({
        ...prev,
        emailOrPhoneNumber: "",
      }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  // Xử lý thay đổi mật khẩu
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);

    if (errors.password) {
      setErrors((prev) => ({
        ...prev,
        password: "",
      }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  // Kiểm tra dữ liệu đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const identifier = emailOrPhoneNumber.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0\d{9,10}|\+84\d{9,10})$/;

    if (!identifier) {
      newErrors.emailOrPhoneNumber = "Vui lòng nhập email hoặc số điện thoại";
    } else if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
      newErrors.emailOrPhoneNumber = "Email hoặc số điện thoại không hợp lệ";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(newErrors);

    // Focus vào trường đầu tiên bị lỗi
    if (newErrors.emailOrPhoneNumber) {
      emailOrPhoneNumberRef.current?.focus();
      return;
    }

    if (newErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setServerError("");
    setLoading(true);

    try {
      // TODO: Tích hợp API đăng nhập Spring Boot
      await login({
      emailOrPhoneNumber,
      password,
    });

     navigate("/dashboard");
    } catch (err) {
      setServerError(err.message || "Đăng nhập thất bại, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="login-card">
        {/* PANEL THƯƠNG HIỆU */}
        <section className="login-brand-panel">
          <img
            src={LoginAndRegisterImage}
            alt="Sân cầu lông SmashFlow"
            className="login-brand-image"
          />

          <div className="login-brand-overlay" />

          <div className="login-brand-content">
            <img
              src={SmashFlowLogo}
              alt="SmashFlow"
              className="login-brand-logo"
            />
            {/* <h1 className="login-brand-title">
              Smash<span>Flow</span>
            </h1>

            <p className="login-brand-tagline">Đặt sân nhanh – Vào sân mượt</p> */}
          </div>

          <p className="login-brand-slogan">BOOK · PLAY · SMASH</p>
        </section>

        {/* FORM ĐĂNG NHẬP */}
        <section className="login-form-panel">
          <form onSubmit={handleSubmit} noValidate className="login-form">
            <header>
              <h2 className="login-heading">Đăng nhập</h2>

              <p className="login-description">
                Chào mừng bạn quay trở lại SmashFlow
              </p>
            </header>

            {/* Lỗi từ server */}
            {serverError && (
              <div role="alert" className="login-server-error">
                {serverError}
              </div>
            )}

            {/* Email hoặc số điện thoại */}
            <div className="login-field">
              <label htmlFor="emailOrPhoneNumber" className="login-label">
                Email hoặc số điện thoại
              </label>

              <input
                ref={emailOrPhoneNumberRef}
                id="emailOrPhoneNumber"
                name="emailOrPhoneNumber"
                type="text"
                autoComplete="username"
                placeholder="Email hoặc số điện thoại"
                value={emailOrPhoneNumber}
                onChange={handleEmailOrPhoneNumberChange}
                aria-invalid={Boolean(errors.emailOrPhoneNumber)}
                aria-describedby={
                  errors.emailOrPhoneNumber
                    ? "emailOrPhoneNumber-error"
                    : undefined
                }
                className="login-input"
              />

              {errors.emailOrPhoneNumber && (
                <p id="emailOrPhoneNumber-error" className="login-field-error">
                  {errors.emailOrPhoneNumber}
                </p>
              )}
            </div>

            {/* Mật khẩu */}
            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Mật khẩu
              </label>

              <div className="login-input-wrapper">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={handlePasswordChange}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className="login-input login-input-password"
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

              {errors.password && (
                <p id="password-error" className="login-field-error">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-button"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            {/* Dòng phân cách */}
            <div className="login-divider">
              <div className="login-divider-line" />

              <span className="login-divider-text">hoặc</span>

              <div className="login-divider-line" />
            </div>

            {/* Link đăng ký */}
            <p className="login-register-text">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="login-register-link">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
