import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/authApi";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // idle: chưa bấm | loading: đang gửi | success | error
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleVerify = async () => {
    setStatus("loading");
    try {
      await authApi.verifyEmail(token);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  return (
    <main className="auth-page">
      <section className="verify-card">
        <h1>Xác thực email</h1>

        {!token && <p>Link xác thực không hợp lệ. Vui lòng kiểm tra lại email.</p>}

        {token && status === "idle" && (
          <>
            <p>Bấm nút bên dưới để hoàn tất xác thực email của bạn.</p>
            <button className="login-submit-button" onClick={handleVerify}>
              Xác nhận email
            </button>
          </>
        )}

        {status === "loading" && <p>Đang xác thực...</p>}

        {status === "success" && (
          <>
            <p>✅ Email của bạn đã được xác thực.</p>
            <Link to="/login" className="login-register-link">Đăng nhập ngay</Link>
          </>
        )}

        {status === "error" && (
          <>
            <p>❌ {errorMessage}</p>
            <Link to="/check-email" className="login-register-link">Gửi lại link mới</Link>
          </>
        )}
      </section>
    </main>
  );
}