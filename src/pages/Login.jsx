import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import "./Auth.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("All fields are required."); return; }
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand" onClick={() => navigate("/")}>
          <div className="auth-logo-mark">C</div>
          <span className="auth-logo-text">Claro</span>
        </div>
        <h1 className="auth-title">Welcome back.<br />Your finances await.</h1>
        <p className="auth-sub">Sign in to see your spending insights, track goals, and get your daily financial briefing.</p>
        <div className="auth-features">
          {["Your data is private and secure", "Pick up exactly where you left off", "AI insights updated daily", "All your goals and history saved"].map((f, i) => (
            <div key={i} className="auth-feature-item">
              <div className="afi-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-title">Sign in to Claro</div>
          <div className="auth-card-sub">New here? <Link to="/signup" className="auth-link">Create an account</Link></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input type={showPass ? "text" : "password"} placeholder="Your password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
