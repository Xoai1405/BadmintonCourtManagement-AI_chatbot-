import { Eye, EyeOff } from "lucide-react";
import { useRef, useState } from "react";
import LoginAndRegisterImage from "../assets/LoginAndRegisterImage.jpg";
import SmashFlowLogo from "../assets/Logo.png";
import { Link, useNavigate} from "react-router-dom";
import { authApi } from "../api/authApi";
export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState([false, false]);
const [successMessage, setSuccessMessage] = useState("");
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneNumberRef = useRef(null);
  const passwordRef = useRef(null);
  const repeatPasswordRef = useRef(null);
  
  const navigate = useNavigate();
  // Xóa lỗi của một trường khi người dùng nhập lại
  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  const handleFullnameChange = (e) => {
    setFullName(e.target.value);
    clearFieldError("fullName");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    clearFieldError("email");
  };

  const handlePhoneNumberChange = (e) => {
    setPhoneNumber(e.target.value);
    clearFieldError("phoneNumber");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    clearFieldError("password");

    // Nếu mật khẩu xác nhận đã nhập, kiểm tra lại khi mật khẩu đổi
    if (repeatPassword && repeatPassword !== e.target.value) {
      setErrors((prev) => ({
        ...prev,
        repeatPassword: "Mật khẩu không trùng khớp",
      }));
    } else if (repeatPassword) {
      setErrors((prev) => ({
        ...prev,
        repeatPassword: "",
      }));
    }
  };

  const handleRepeatPasswordChange = (e) => {
    setRepeatPassword(e.target.value);
    clearFieldError("repeatPassword");
  };

  // Kiểm tra dữ liệu đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPhoneNumber = phoneNumber.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedFullName) {
      newErrors.fullName = "Vui lòng nhập họ tên";
    }

    if (!normalizedEmail) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!emailRegex.test(normalizedEmail)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!normalizedPhoneNumber) {
      newErrors.phoneNumber = "Vui lòng nhập số điện thoại";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 8) {
      newErrors.password = "Mật khẩu tối thiểu phải chứa 8 ký tự";
    }

    if (!repeatPassword) {
      newErrors.repeatPassword = "Vui lòng nhập lại mật khẩu";
    } else if (repeatPassword !== password) {
      newErrors.repeatPassword = "Mật khẩu không trùng khớp";
    }

    setErrors(newErrors);

    // Focus vào trường lỗi đầu tiên
    if (newErrors.fullName) {
      fullNameRef.current?.focus();
      return;
    }

    if (newErrors.email) {
      emailRef.current?.focus();
      return;
    }

    if (newErrors.phoneNumber) {
      phoneNumberRef.current?.focus();
      return;
    }

    if (newErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    if (newErrors.repeatPassword) {
      repeatPasswordRef.current?.focus();
      return;
    }

    setLoading(true);
    setServerError("");

    try {
     await authApi.register({
      fullName,
      email,
      phoneNumber,
      password,
    });

    setSuccessMessage("Đăng ký thành công!");

    navigate("/login", {
      replace: true,
      state: { registered: true },
    });
    } catch (err) {
      setServerError(err.message || "Đăng ký thất bại, vui lòng thử lại!");
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
          </div>

          <p className="login-brand-slogan">BOOK · PLAY · SMASH</p>
        </section>

        {/* FORM ĐĂNG KÝ */}
        <section className="login-form-panel register-form-panel">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="login-form register-form"
          >
            <header>
              <h2 className="login-heading">Đăng ký</h2>

              <p className="login-description">
                Tạo tài khoản để bắt đầu trải nghiệm SmashFlow
              </p>
            </header>

            {/* Lỗi từ server */}
            {serverError && (
              <div role="alert" className="login-server-error">
                {serverError}
              </div>
            )}

            {/* Họ tên */}
            <div className="login-field">
              <label htmlFor="fullName" className="login-label">
                Họ và tên
              </label>

              <input
                ref={fullNameRef}
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={handleFullnameChange}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={
                  errors.fullName ? "fullName-error" : undefined
                }
                className="login-input"
              />

              {errors.fullName && (
                <p id="fullName-error" className="login-field-error">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email
              </label>

              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={handleEmailChange}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="login-input"
              />

              {errors.email && (
                <p id="email-error" className="login-field-error">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="login-field">
              <label htmlFor="phoneNumber" className="login-label">
                Số điện thoại
              </label>

              <input
                ref={phoneNumberRef}
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                placeholder="0123456789"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={
                  errors.phoneNumber ? "phoneNumber-error" : undefined
                }
                className="login-input"
              />

              {errors.phoneNumber && (
                <p id="phoneNumber-error" className="login-field-error">
                  {errors.phoneNumber}
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
                  type={showPassword[0] ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
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
                  onClick={() => setShowPassword((prev) => [!prev[0], prev[1]])}
                  aria-label={showPassword[0] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword[0]}
                  className="login-password-toggle"
                >
                  {showPassword[0] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && (
                <p id="password-error" className="login-field-error">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="login-field">
              <label htmlFor="repeatPassword" className="login-label">
                Xác nhận mật khẩu
              </label>

              <div className="login-input-wrapper">
                <input
                  ref={repeatPasswordRef}
                  id="repeatPassword"
                  name="repeatPassword"
                  type={showPassword[1] ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={repeatPassword}
                  onChange={handleRepeatPasswordChange}
                  aria-invalid={Boolean(errors.repeatPassword)}
                  aria-describedby={
                    errors.repeatPassword ? "repeatPassword-error" : undefined
                  }
                  className="login-input login-input-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => [prev[0], !prev[1]])}
                  aria-label={
                    showPassword[1]
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                  aria-pressed={showPassword[1]}
                  className="login-password-toggle"
                >
                  {showPassword[1] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.repeatPassword && (
                <p id="repeatPassword-error" className="login-field-error">
                  {errors.repeatPassword}
                </p>
              )}
            </div>

            {/* Nút đăng ký */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-button"
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>

            {/* Link đăng nhập */}
            <p className="login-register-text mt-5">
              Đã có tài khoản?{" "}
              <Link to="/login" className="login-register-link">
                Đăng nhập
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
